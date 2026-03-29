import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GrantsVaultModule = buildModule("GrantsVaultModule", (m) => {
    // Deploy GrantsVault
    const grantsVault = m.contract("GrantsVault");

    return { grantsVault };
});

export default GrantsVaultModule;
