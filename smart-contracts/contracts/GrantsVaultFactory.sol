// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./GrantsVault.sol";

/**
 * @title GrantsVaultFactory
 * @dev Factory contract to deploy isolated GrantsVault instances for each Program.
 */
contract GrantsVaultFactory {
    // ─── Events ──────────────────────────────────────────────────────────────

    event VaultDeployed(address indexed vaultAddress, address indexed owner, string programId);

    // ─── Storage ─────────────────────────────────────────────────────────────

    // Mapping of programId (from off-chain DB) to its deployed vault address
    mapping(string => address) public programVaults;

    // Optional array to keep track of all deployed vaults
    address[] public allVaults;

    // ─── Functions ───────────────────────────────────────────────────────────

    /**
     * @dev Deploys a new GrantsVault for a specific program and transfers ownership to the caller.
     * @param programId The unique ID of the program (e.g., from Convex DB).
     */
    function deployVault(string calldata programId) external returns (address) {
        require(programVaults[programId] == address(0), "Vault already deployed for this program");

        // Deploy the new vault
        GrantsVault newVault = new GrantsVault();

        // The factory is initially the owner since it deployed the contract.
        // Transfer ownership to the manager (the account calling this function).
        newVault.transferOwnership(msg.sender);

        address vaultAddress = address(newVault);

        // Record the deployment
        programVaults[programId] = vaultAddress;
        allVaults.push(vaultAddress);

        emit VaultDeployed(vaultAddress, msg.sender, programId);

        return vaultAddress;
    }

    /**
     * @dev Gets the total number of deployed vaults.
     */
    function getVaultsCount() external view returns (uint256) {
        return allVaults.length;
    }
}
