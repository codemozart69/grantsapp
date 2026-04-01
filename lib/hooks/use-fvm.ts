import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { GRANTS_VAULT_FACTORY_ADDRESS, GRANTS_VAULT_FACTORY_ABI, GRANTS_VAULT_ABI } from "@/lib/contracts";

export function useDeployVault() {
  const { data: hash, writeContractAsync, isPending: isDeploying, error: deployError } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmed, error: confirmError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const deployVault = async (programId: string) => {
    return await writeContractAsync({
      address: GRANTS_VAULT_FACTORY_ADDRESS,
      abi: GRANTS_VAULT_FACTORY_ABI,
      functionName: "deployVault",
      args: [programId],
    });
  };

  return {
    deployVault,
    isDeploying: isDeploying || isWaiting,
    isConfirmed,
    error: deployError || confirmError,
    receipt,
    hash,
  };
}

export function useRegisterGrant() {
  const { data: hash, writeContractAsync, isPending: isRegistering, error: registerError } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmed, error: confirmError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const registerGrant = async (
    vaultAddress: `0x${string}`,
    grantId: string,
    builder: `0x${string}`,
    milestoneAmounts: bigint[],
    isNativeFlags: boolean[],
    tokenAddresses: `0x${string}`[]
  ) => {
    return await writeContractAsync({
      address: vaultAddress,
      abi: GRANTS_VAULT_ABI,
      functionName: "registerGrant",
      args: [grantId, builder, milestoneAmounts, isNativeFlags, tokenAddresses],
    });
  };

  return {
    registerGrant,
    isRegistering: isRegistering || isWaiting,
    isConfirmed,
    error: registerError || confirmError,
    receipt,
    hash,
  };
}

export function useReleaseMilestone() {
  const { data: hash, writeContractAsync, isPending: isReleasing, error: releaseError } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmed, error: confirmError, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const releaseMilestone = async (vaultAddress: `0x${string}`, grantId: string) => {
    return await writeContractAsync({
      address: vaultAddress,
      abi: GRANTS_VAULT_ABI,
      functionName: "releaseNextMilestone",
      args: [grantId],
    });
  };

  return {
    releaseMilestone,
    isReleasing: isReleasing || isWaiting,
    isConfirmed,
    error: releaseError || confirmError,
    receipt,
    hash,
  };
}
