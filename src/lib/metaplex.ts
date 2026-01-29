import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { 
  createNft, 
  mplTokenMetadata,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  generateSigner,
  percentAmount,
  publicKey as umiPublicKey,
  type Umi,
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { WalletContextState } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

// Solana Devnet RPC
const SOLANA_NETWORK = "https://api.devnet.solana.com";

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface MintNFTResult {
  signature: string;
  mintAddress: string;
  explorerUrl: string;
}

/**
 * Create Umi instance with wallet adapter
 */
export function createUmiWithWallet(wallet: WalletContextState): Umi {
  const umi = createUmi(SOLANA_NETWORK)
    .use(mplTokenMetadata())
    .use(walletAdapterIdentity(wallet));
  
  return umi;
}

/**
 * Create off-chain JSON metadata for the NFT
 * In production, this would be uploaded to Arweave/IPFS
 * For now, we'll use a data URI or external URL
 */
export function createNFTMetadataJson(
  serialNumber: string,
  productName: string,
  productDescription: string,
  certificateImageUrl: string,
  issuerId: string,
  issuedAt: string,
  category?: string
): NFTMetadata {
  return {
    name: `COA: ${productName}`,
    symbol: "ASEAL",
    description: productDescription || `Certificate of Authenticity for ${productName}`,
    image: certificateImageUrl,
    external_url: `https://authentiseal.app/verify/${serialNumber}`,
    attributes: [
      { trait_type: "Serial Number", value: serialNumber },
      { trait_type: "Product Name", value: productName },
      { trait_type: "Issuer ID", value: issuerId },
      { trait_type: "Issue Date", value: issuedAt },
      { trait_type: "Category", value: category || "General" },
      { trait_type: "Certificate Type", value: "Authenticity" },
      { trait_type: "Verification", value: "AuthentiSeal Verified" },
    ],
  };
}

/**
 * Create a data URI from metadata (for development/testing)
 * In production, upload to Arweave/IPFS and use that URI
 */
export function metadataToDataUri(metadata: NFTMetadata): string {
  const jsonString = JSON.stringify(metadata);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  return `data:application/json;base64,${base64}`;
}

/**
 * Mint an NFT with the certificate image and metadata
 */
export async function mintCertificateNFT(
  wallet: WalletContextState,
  metadata: NFTMetadata,
  metadataUri: string
): Promise<MintNFTResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const umi = createUmiWithWallet(wallet);
  const mint = generateSigner(umi);

  // Create the NFT
  const { signature } = await createNft(umi, {
    mint,
    name: metadata.name.slice(0, 32), // Max 32 chars for on-chain name
    symbol: metadata.symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0), // No royalties for COA
    creators: [
      {
        address: umi.identity.publicKey,
        share: 100,
        verified: true,
      },
    ],
    isMutable: false, // COA should be immutable
  }).sendAndConfirm(umi);

  const signatureString = bs58.encode(signature);

  return {
    signature: signatureString,
    mintAddress: mint.publicKey.toString(),
    explorerUrl: `https://explorer.solana.com/address/${mint.publicKey.toString()}?cluster=devnet`,
  };
}

/**
 * Fetch NFT details from mint address
 */
export async function fetchNFTDetails(
  wallet: WalletContextState,
  mintAddress: string
) {
  const umi = createUmiWithWallet(wallet);
  const asset = await fetchDigitalAsset(umi, umiPublicKey(mintAddress));
  return asset;
}

/**
 * Estimate minting costs (approximate)
 */
export const MINTING_COSTS = {
  nft: {
    solAmount: 0.012, // ~0.012 SOL for NFT minting
    description: "Full NFT with image metadata",
  },
  memo: {
    solAmount: 0.0001, // ~0.0001 SOL for memo
    description: "Privacy memo (text only)",
  },
};

export type MintingMode = "nft" | "memo";
