import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { 
  createNft, 
  mplTokenMetadata,
  fetchDigitalAsset,
  updateV1,
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
import { SOLANA_RPC_ENDPOINT, getExplorerAddressUrl } from "@/lib/solana-config";

const SOLANA_NETWORK = SOLANA_RPC_ENDPOINT;

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
 * Note: Minimal sensitive data - uses verification URL instead of exposing internal IDs
 */
export function createNFTMetadataJson(
  serialNumber: string,
  productName: string,
  productDescription: string,
  certificateImageUrl: string,
  _issuerId: string, // Unused intentionally - issuer ID should not be in public metadata
  issuedAt: string,
  category?: string
): NFTMetadata {
  return {
    name: `COA: ${productName}`,
    symbol: "ASEAL",
    description: productDescription || `Certificate of Authenticity for ${productName}`,
    image: certificateImageUrl,
    // Use published domain for external URL - verification handles the lookup
    external_url: `https://authenti-seek.lovable.app/verify?serial=${encodeURIComponent(serialNumber)}`,
    attributes: [
      { trait_type: "Serial Number", value: serialNumber },
      { trait_type: "Product Name", value: productName },
      // Issuer ID removed - can be looked up via verification
      { trait_type: "Issue Date", value: issuedAt },
      { trait_type: "Category", value: category || "General" },
      { trait_type: "Certificate Type", value: "Authenticity" },
      { trait_type: "Verification", value: "AuthentiSeal Verified" },
    ],
  };
}

/**
 * Create metadata URI pointing to our edge function
 * Uses a hash-based path to prevent enumeration attacks
 */
export async function createMetadataUri(serialNumber: string): Promise<string> {
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  // Create a hashed path to prevent serial number enumeration
  const encoder = new TextEncoder();
  const data = encoder.encode(serialNumber + "authenti-seal-salt-v1");
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data.buffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
  
  return `https://${supabaseProjectId}.supabase.co/functions/v1/nft-metadata/${hashHex}`;
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
    isMutable: true, // Must be mutable to support ownership transfers and metadata updates
  }).sendAndConfirm(umi);

  const signatureString = bs58.encode(signature);

  return {
    signature: signatureString,
    mintAddress: mint.publicKey.toString(),
    explorerUrl: getExplorerAddressUrl(mint.publicKey.toString()),
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
 * Lock an NFT by setting isMutable to false.
 * WARNING: This is irreversible. Once locked, metadata can never be updated.
 * This prevents "The Plastic Swap" attack where metadata URI is changed post-mint.
 */
export async function lockCertificateNFT(
  wallet: WalletContextState,
  mintAddress: string
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const umi = createUmiWithWallet(wallet);
  const mintPubkey = umiPublicKey(mintAddress);

  // Fetch current asset to get the update authority
  const asset = await fetchDigitalAsset(umi, mintPubkey);

  const { signature } = await updateV1(umi, {
    mint: mintPubkey,
    authority: umi.identity,
    data: { ...asset.metadata, sellerFeeBasisPoints: asset.metadata.sellerFeeBasisPoints },
    isMutable: false,
  }).sendAndConfirm(umi);

  return bs58.encode(signature);
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
