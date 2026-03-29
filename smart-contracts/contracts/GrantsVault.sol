// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GrantsVault
 * @dev Vault for holding and distributing grant funds (FIL and ERC20 tokens like USDC).
 */
contract GrantsVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Structs & Events ───────────────────────────────────────────────────

    struct Milestone {
        uint256 amount;
        bool isNative; // True for FIL, false for ERC20
        address tokenAddress; // For ERC20
        bool isPaid;
    }

    struct Grant {
        address builder;
        uint256 currentMilestone;
        uint256 totalMilestones;
        bool isActive;
    }

    // Mapping from global grant ID (e.g., from off-chain database) to Grant struct
    mapping(string => Grant) public grants;
    
    // Mapping from grant ID -> milestone index -> Milestone definition
    mapping(string => mapping(uint256 => Milestone)) public grantMilestones;

    event GrantRegistered(string indexed grantId, address indexed builder, uint256 totalMilestones);
    event MilestoneDefined(string indexed grantId, uint256 indexed milestoneIndex, uint256 amount, bool isNative, address tokenAddress);
    event MilestonePaid(string indexed grantId, uint256 indexed milestoneIndex, uint256 amount, bool isNative, address tokenAddress);
    event VaultFundedNative(address indexed funder, uint256 amount);

    // ─── Initialization ─────────────────────────────────────────────────────

    // Pass the deployer address to the Ownable constructor.
    constructor() Ownable(msg.sender) {}

    // ─── User Actions ───────────────────────────────────────────────────────

    /**
     * @dev Allows anyone to fund the vault with native FIL.
     */
    receive() external payable {
        emit VaultFundedNative(msg.sender, msg.value);
    }

    // ─── Admin Actions ──────────────────────────────────────────────────────

    /**
     * @dev Registers a new grant and defines its milestones in one transaction.
     * Only the owner can call this.
     */
    function registerGrant(
        string calldata grantId,
        address builder,
        uint256[] calldata milestoneAmounts,
        bool[] calldata isNativeFlags,
        address[] calldata tokenAddresses
    ) external onlyOwner whenNotPaused {
        require(!grants[grantId].isActive && grants[grantId].builder == address(0), "Grant already exists");
        require(milestoneAmounts.length > 0, "No milestones provided");
        require(
            milestoneAmounts.length == isNativeFlags.length && milestoneAmounts.length == tokenAddresses.length,
            "Array lengths must match"
        );

        grants[grantId] = Grant({
            builder: builder,
            currentMilestone: 0,
            totalMilestones: milestoneAmounts.length,
            isActive: true
        });

        emit GrantRegistered(grantId, builder, milestoneAmounts.length);

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            grantMilestones[grantId][i] = Milestone({
                amount: milestoneAmounts[i],
                isNative: isNativeFlags[i],
                tokenAddress: tokenAddresses[i],
                isPaid: false
            });
            emit MilestoneDefined(grantId, i, milestoneAmounts[i], isNativeFlags[i], tokenAddresses[i]);
        }
    }

    /**
     * @dev Pays out the next unpaid milestone for a grant.
     */
    function releaseNextMilestone(string calldata grantId) external onlyOwner whenNotPaused nonReentrant {
        Grant storage grant = grants[grantId];
        require(grant.isActive, "Grant not active");
        require(grant.currentMilestone < grant.totalMilestones, "All milestones paid");

        uint256 currentIdx = grant.currentMilestone;
        Milestone storage ms = grantMilestones[grantId][currentIdx];
        require(!ms.isPaid, "Milestone already paid");

        // Mark as paid before transferring to prevent reentrancy issues
        ms.isPaid = true;
        grant.currentMilestone += 1;

        if (grant.currentMilestone == grant.totalMilestones) {
            grant.isActive = false; // Close grant if fully paid
        }

        // Execute transfer
        if (ms.isNative) {
            require(address(this).balance >= ms.amount, "Insufficient native funds in vault");
            (bool success, ) = grant.builder.call{value: ms.amount}("");
            require(success, "Native transfer failed");
        } else {
            require(ms.tokenAddress != address(0), "Invalid token address");
            IERC20(ms.tokenAddress).safeTransfer(grant.builder, ms.amount);
        }

        emit MilestonePaid(grantId, currentIdx, ms.amount, ms.isNative, ms.tokenAddress);
    }

    /**
     * @dev Emergency controls
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
