import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GrantsVaultFactoryModule = buildModule("GrantsVaultFactoryModule", (m) => {
    // Deploy the Factory contract
    const factory = m.contract("GrantsVaultFactory");

    return { factory };
});

export default GrantsVaultFactoryModule;
