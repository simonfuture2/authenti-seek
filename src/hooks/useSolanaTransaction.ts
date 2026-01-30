import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  storeCertificateOnChain,
  verifyCertificateOnChain,
  hashCertificateData,
  getExplorerUrl,
  getWalletBalance,
  hasEnoughBalance,
  CertificateOnChainData,
  OnChainResult,
} from "@/lib/solana";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/errorHandler";
import { useBlockchainAudit } from "@/hooks/useBlockchainAudit";

export function useSolanaTransaction() {
  const wallet = useWallet();
  const { toast } = useToast();
  const { logMint, logMintError, logVerification, logOperation } = useBlockchainAudit();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<OnChainResult | null>(null);

  const submitCertificate = useCallback(
    async (data: CertificateOnChainData): Promise<OnChainResult | null> => {
      if (!wallet.connected || !wallet.publicKey) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your Solana wallet first.",
          variant: "destructive",
        });
        return null;
      }

      const walletAddress = wallet.publicKey.toBase58();
      setIsSubmitting(true);

      try {
        // Check balance
        const hasBalance = await hasEnoughBalance(wallet.publicKey);
        if (!hasBalance) {
          await logMintError("memo", data.serialNumber, walletAddress, "Insufficient balance");
          toast({
            title: "Insufficient Balance",
            description: "You need at least 0.001 SOL for transaction fees.",
            variant: "destructive",
          });
          return null;
        }

        // Store on chain
        const result = await storeCertificateOnChain(wallet, data);
        setLastResult(result);

        // Audit log success
        await logMint("memo", data.serialNumber, walletAddress, result.signature);

        toast({
          title: "Stored On-Chain! 🎉",
          description: `Transaction confirmed. Signature: ${result.signature.slice(0, 8)}...`,
        });

        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError(error, "useSolanaTransaction.submitCertificate");
        
        // Audit log failure
        await logMintError("memo", data.serialNumber, walletAddress, errorMessage);
        
        toast({
          title: "Transaction Failed",
          description: "Failed to store on blockchain. Please try again.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [wallet, toast, logMint, logMintError]
  );

  const verifyCertificate = useCallback(
    async (signature: string, expectedHash?: string, certificateId?: string) => {
      try {
        const result = await verifyCertificateOnChain(signature, expectedHash);
        
        // Audit log verification attempt
        if (certificateId) {
          await logVerification(certificateId, signature, result.verified, {
            slot: result.slot,
            blockTime: result.blockTime,
          });
        }
        
        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError(error, "useSolanaTransaction.verifyCertificate");
        
        // Audit log failed verification
        if (certificateId) {
          await logOperation({
            operation: "verify_onchain",
            certificateId,
            solanaSignature: signature,
            success: false,
            errorMessage,
          });
        }
        
        return { verified: false, onChainData: null, blockTime: null, slot: 0 };
      }
    },
    [logVerification, logOperation]
  );

  const getBalance = useCallback(async () => {
    if (!wallet.publicKey) return 0;
    
    try {
      const balance = await getWalletBalance(wallet.publicKey);
      
      // Audit log balance check
      await logOperation({
        operation: "balance_check",
        walletAddress: wallet.publicKey.toBase58(),
        success: true,
        metadata: { balance },
      });
      
      return balance;
    } catch (error) {
      return 0;
    }
  }, [wallet.publicKey, logOperation]);

  return {
    submitCertificate,
    verifyCertificate,
    getBalance,
    isSubmitting,
    lastResult,
    getExplorerUrl,
    hashCertificateData,
    isConnected: wallet.connected,
    publicKey: wallet.publicKey,
  };
}
