import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/errorHandler";
import { useBlockchainAudit } from "@/hooks/useBlockchainAudit";
import {
  mintCertificateNFT,
  createNFTMetadataJson,
  createMetadataUri,
  MintNFTResult,
  MintingMode,
} from "@/lib/metaplex";
import {
  storeCertificateOnChain,
  CertificateOnChainData,
  OnChainResult,
  getExplorerUrl,
  hasEnoughBalance,
} from "@/lib/solana";
import type { Certificate } from "@/hooks/useCertificates";

interface MintResult {
  success: boolean;
  signature?: string;
  mintAddress?: string;
  explorerUrl?: string;
  mode: MintingMode;
}

export function useNFTMinting() {
  const wallet = useWallet();
  const { toast } = useToast();
  const { logMint, logMintError } = useBlockchainAudit();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<MintResult | null>(null);

  /**
   * Mint certificate using selected mode
   */
  const mintCertificate = useCallback(
    async (
      certificate: Certificate,
      issuerId: string,
      mode: MintingMode
    ): Promise<MintResult | null> => {
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
        const minBalance = mode === "nft" ? 0.015 : 0.001;
        const hasBalance = await hasEnoughBalance(wallet.publicKey, minBalance);
        if (!hasBalance) {
          await logMintError(
            mode,
            certificate.id,
            walletAddress,
            "Insufficient balance"
          );
          toast({
            title: "Insufficient Balance",
            description: `You need at least ${minBalance} SOL for this transaction.`,
            variant: "destructive",
          });
          return null;
        }

        if (mode === "nft") {
          // Full NFT minting with Metaplex
          const metadata = certificate.metadata as { certificateImageUrl?: string } | null;
          const certificateImageUrl = metadata?.certificateImageUrl || 
            (certificate.product_images?.[0] ?? "");

          if (!certificateImageUrl) {
            await logMintError(
              mode,
              certificate.id,
              walletAddress,
              "No certificate image"
            );
            toast({
              title: "No Certificate Image",
              description: "Please ensure the certificate has an image before minting as NFT.",
              variant: "destructive",
            });
            return null;
          }

          const nftMetadata = createNFTMetadataJson(
            certificate.serial_number,
            certificate.product_name,
            certificate.product_description || "",
            certificateImageUrl,
            issuerId,
            certificate.issued_at,
            certificate.product_category || undefined
          );

          // Create metadata URI pointing to our edge function (async)
          const metadataUri = await createMetadataUri(certificate.serial_number);

          // Mint the NFT
          const result = await mintCertificateNFT(wallet, nftMetadata, metadataUri);

          const mintResult: MintResult = {
            success: true,
            signature: result.signature,
            mintAddress: result.mintAddress,
            explorerUrl: result.explorerUrl,
            mode: "nft",
          };

          setLastResult(mintResult);

          // Audit log success
          await logMint(mode, certificate.id, walletAddress, result.signature);

          toast({
            title: "NFT Minted! 🎉",
            description: "Your certificate is now a visual NFT on Solana.",
          });

          return mintResult;
        } else {
          // Privacy memo mode (existing implementation)
          // Extract NFC Tag ID from unique_identifiers if available
          const uniqueIdentifiers = (certificate.unique_identifiers || {}) as Record<string, string>;
          
          const onChainData: CertificateOnChainData = {
            serialNumber: certificate.serial_number,
            productName: certificate.product_name,
            issuerId,
            timestamp: Date.now(),
            metadataHash: certificate.id,
            nfcTagId: uniqueIdentifiers.nfcTagId || undefined,
          };

          const result = await storeCertificateOnChain(wallet, onChainData);

          const mintResult: MintResult = {
            success: true,
            signature: result.signature,
            explorerUrl: getExplorerUrl(result.signature),
            mode: "memo",
          };

          setLastResult(mintResult);

          // Audit log success
          await logMint(mode, certificate.id, walletAddress, result.signature);

          toast({
            title: "Stored On-Chain! 🎉",
            description: "Certificate hash stored via memo program.",
          });

          return mintResult;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError(error, "useNFTMinting.mintCertificate");
        
        // Audit log failure
        await logMintError(mode, certificate.id, walletAddress, errorMessage);
        
        toast({
          title: "Minting Failed",
          description: errorMessage || "Failed to mint certificate. Please try again.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [wallet, toast, logMint, logMintError]
  );

  return {
    mintCertificate,
    isSubmitting,
    lastResult,
    isConnected: wallet.connected,
    publicKey: wallet.publicKey,
  };
}
