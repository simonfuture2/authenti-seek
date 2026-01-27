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

export function useSolanaTransaction() {
  const wallet = useWallet();
  const { toast } = useToast();
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

      setIsSubmitting(true);

      try {
        // Check balance
        const hasBalance = await hasEnoughBalance(wallet.publicKey);
        if (!hasBalance) {
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

        toast({
          title: "Stored On-Chain! 🎉",
          description: `Transaction confirmed. Signature: ${result.signature.slice(0, 8)}...`,
        });

        return result;
      } catch (error: any) {
        console.error("Solana transaction error:", error);
        toast({
          title: "Transaction Failed",
          description: error.message || "Failed to store on blockchain.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [wallet, toast]
  );

  const verifyCertificate = useCallback(
    async (signature: string, expectedHash?: string) => {
      try {
        const result = await verifyCertificateOnChain(signature, expectedHash);
        return result;
      } catch (error: any) {
        console.error("Verification error:", error);
        return { verified: false, onChainData: null, blockTime: null, slot: 0 };
      }
    },
    []
  );

  const getBalance = useCallback(async () => {
    if (!wallet.publicKey) return 0;
    return getWalletBalance(wallet.publicKey);
  }, [wallet.publicKey]);

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
