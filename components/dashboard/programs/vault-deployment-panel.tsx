"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconWallet, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { useDeployVault } from "@/lib/hooks/use-fvm";
import { useAccount } from "wagmi";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { decodeEventLog } from "viem";
import { GRANTS_VAULT_FACTORY_ABI } from "@/lib/contracts";

interface VaultDeploymentPanelProps {
  programId: Id<"programs">;
  vaultAddress?: string;
  vaultChainId?: number;
}

export function VaultDeploymentPanel({
  programId,
  vaultAddress,
  vaultChainId,
}: VaultDeploymentPanelProps) {
  const { isConnected, chain } = useAccount();
  const { deployVault, isDeploying, isConfirmed, receipt, error } = useDeployVault();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setVaultAddress = useMutation((api as any).programs.setVaultAddress);

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isConfirmed && receipt) {
      // Find the VaultDeployed event to extract the deployed address
      try {
        const deployEvent = receipt.logs.map((log: any) => {
          try {
            return decodeEventLog({
              abi: GRANTS_VAULT_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
          } catch (e) {
            return null;
          }
        }).find((event: any) => event?.eventName === "VaultDeployed");

        if (deployEvent && deployEvent.args) {
          const newVaultAddress = (deployEvent.args as any).vaultAddress;
          setVaultAddress({
            programId,
            vaultAddress: newVaultAddress,
            // Assuming 314159 if chain is connected to calibration
            vaultChainId: chain?.id || 314159,
          });
        }
      } catch (err) {
        console.error("Error decoding vault address", err);
        setLocalError("Failed to extract vault address from transaction.");
      }
    }
  }, [isConfirmed, receipt, setVaultAddress, programId, chain]);

  if (vaultAddress) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <IconCheck size={18} />
          </div>
          <h3 className="font-medium">FVM Vault Deployed</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4 pl-11">
          This program has an isolated smart contract vault on Filecoin Calibration.
        </p>
        <div className="pl-11 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">Address:</span>
            <span className="font-mono text-muted-foreground">{vaultAddress}</span>
            <a 
              href={`https://calibration.filfox.info/en/address/${vaultAddress}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              <IconExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6 mb-6 bg-card">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
          <IconWallet size={18} />
        </div>
        <h3 className="font-medium">Web3 Payments (FVM)</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4 pl-11">
        Deploy a dedicated smart contract vault for this program to disburse milestone payments securely on the Filecoin network.
      </p>

      <div className="pl-11">
        {!isConnected ? (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md inline-block">
            Please connect your wallet using the button below to deploy the contract.
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => {
                setLocalError(null);
                deployVault(programId).catch(err => {
                   setLocalError(err.shortMessage || err.message || "Failed to initiate transaction");
                });
              }}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deploying on Chain...
                </>
              ) : (
                "Deploy Program Vault"
              )}
            </Button>
            
            {(error || localError) && (
              <span className="text-xs text-destructive max-w-sm truncate">
                {localError || error?.message}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
