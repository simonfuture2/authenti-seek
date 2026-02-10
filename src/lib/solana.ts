import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  SOLANA_RPC_ENDPOINT,
  getExplorerTxUrl,
  SOLANA_CLUSTER,
  DEFAULT_COMPUTE_UNIT_LIMIT,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
} from "@/lib/solana-config";
import { clusterApiUrl } from "@solana/web3.js";

// Solana Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// Metaplex Token Metadata Program ID
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const SOLANA_NETWORK = SOLANA_RPC_ENDPOINT;

export interface CertificateOnChainData {
  serialNumber: string;
  productName: string;
  issuerId: string;
  timestamp: number;
  metadataHash: string;
  nfcTagId?: string; // Optional NFC tag ID for physical verification
}

export interface OnChainResult {
  signature: string;
  slot: number;
  blockTime: number | null;
}

/**
 * Hash a string using SHA-256 via Web Crypto API
 * Returns hex string truncated to specified length
 */
async function sha256Hash(input: string, truncateLength: number = 32): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(input);
  // Cast to unknown first to satisfy TypeScript strict mode
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", dataBuffer.buffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, truncateLength);
}

/**
 * Create a cryptographically secure SHA-256 hash of the certificate data
 * Uses Web Crypto API for security - 128-bit output for compactness
 */
export async function hashCertificateData(data: CertificateOnChainData): Promise<string> {
  // Create a deterministic, alphabetically-ordered data string for consistent hashing
  // Keys are shortened to minimize on-chain footprint
  const dataString = JSON.stringify({
    i: data.issuerId,
    m: data.metadataHash,
    n: data.nfcTagId || "",
    p: data.productName,
    s: data.serialNumber,
    t: data.timestamp,
  });
  
  return sha256Hash(dataString, 32);
}

/**
 * Add compute budget instructions (unit limit + priority fee) to a transaction.
 * This improves reliability during network congestion.
 */
export function addComputeBudget(
  tx: Transaction,
  unitLimit: number = DEFAULT_COMPUTE_UNIT_LIMIT,
  microLamports: number = DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS
): Transaction {
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: unitLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
  );
  return tx;
}

/**
 * Store certificate hash on Solana blockchain using Memo program
 * Uses minimal data format to reduce exposure and on-chain footprint
 */
export async function storeCertificateOnChain(
  wallet: WalletContextState,
  certificateData: CertificateOnChainData
): Promise<OnChainResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const connection = new Connection(SOLANA_NETWORK, "confirmed");

  // Create certificate hash using cryptographically secure SHA-256
  const certificateHash = await hashCertificateData(certificateData);

  // Build minimal memo data - only hash is needed for verification
  // Using short keys to minimize on-chain footprint and limit fingerprinting
  const memoPayload: Record<string, string> = {
    t: "AS", // Type: AuthentiSeal (shortened to prevent fingerprinting)
    h: certificateHash,
  };

  // Add NFC hash if present (hashed for privacy protection)
  if (certificateData.nfcTagId) {
    memoPayload.n = await sha256Hash(certificateData.nfcTagId, 16);
  }

  const memoData = JSON.stringify(memoPayload);

  // Create memo instruction
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoData, "utf-8"),
  });

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // Create transaction with compute budget for congestion resilience
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: wallet.publicKey,
  }).add(memoInstruction);
  addComputeBudget(transaction);

  // Sign and send transaction
  const signedTx = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTx.serialize());

  // Confirm transaction
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  // Get transaction details
  const txDetails = await connection.getTransaction(signature, {
    commitment: "confirmed",
  });

  return {
    signature,
    slot: txDetails?.slot || 0,
    blockTime: txDetails?.blockTime || null,
  };
}

/**
 * Verify certificate hash on Solana blockchain
 * Returns sanitized data - only verification status and minimal info
 */
export async function verifyCertificateOnChain(
  signature: string,
  expectedHash?: string
): Promise<{
  verified: boolean;
  onChainData: Record<string, unknown> | null;
  blockTime: number | null;
  slot: number;
  cluster?: string;
}> {
  // Build ordered list of RPC endpoints to try:
  // 1. Currently configured cluster (fast path)
  // 2. The other cluster (fallback)
  const endpoints: { url: string; cluster: string }[] = [
    { url: SOLANA_RPC_ENDPOINT, cluster: SOLANA_CLUSTER },
  ];

  const fallbackCluster = SOLANA_CLUSTER === "mainnet-beta" ? "devnet" : "mainnet-beta";
  endpoints.push({
    url: clusterApiUrl(fallbackCluster as "devnet" | "mainnet-beta"),
    cluster: fallbackCluster,
  });

  for (const { url, cluster } of endpoints) {
    try {
      const result = await _verifyOnCluster(url, cluster, signature, expectedHash);
      if (result) return result;
    } catch {
      // Continue to next cluster
    }
  }

  return { verified: false, onChainData: null, blockTime: null, slot: 0 };
}

/**
 * Internal helper: attempt verification against a single cluster.
 * Returns null if the transaction is not found on that cluster.
 */
async function _verifyOnCluster(
  rpcUrl: string,
  cluster: string,
  signature: string,
  expectedHash?: string
): Promise<{
  verified: boolean;
  onChainData: Record<string, unknown> | null;
  blockTime: number | null;
  slot: number;
  cluster: string;
} | null> {
  const connection = new Connection(rpcUrl, "confirmed");

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) return null; // Not found on this cluster

  // Check if the transaction was successful (no error)
  const txSucceeded = tx.meta?.err === null;

  // Try Memo-based verification first
  const memoInstruction = tx.transaction.message.compiledInstructions?.find(
    (ix) => {
      const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
      return programId.equals(MEMO_PROGRAM_ID);
    }
  );

  if (memoInstruction) {
    // Decode memo data
    const memoDataBuffer = Buffer.from(memoInstruction.data);
    const memoDataString = memoDataBuffer.toString("utf-8");
    let parsedData: Record<string, unknown>;

    try {
      const rawData = JSON.parse(memoDataString);

      // Handle both new minimal format (t: "AS") and legacy format (type: "COA_CERTIFICATE")
      if (rawData.t === "AS") {
        parsedData = {
          type: "COA_CERTIFICATE",
          hash: rawData.h,
          hasNfc: !!rawData.n,
        };
      } else if (rawData.type === "COA_CERTIFICATE") {
        parsedData = {
          type: rawData.type,
          hash: rawData.hash,
        };
      } else {
        parsedData = { raw: memoDataString };
      }
    } catch {
      parsedData = { raw: memoDataString };
    }

    // Verify hash if expected hash is provided
    const verified = expectedHash
      ? parsedData.hash === expectedHash
      : parsedData.type === "COA_CERTIFICATE";

    return {
      verified,
      onChainData: {
        verified,
        recordFound: true,
        txType: "memo",
        cluster,
      },
      blockTime: tx.blockTime,
      slot: tx.slot,
      cluster,
    };
  }

  // Check for Metaplex NFT mint transaction
  const hasMetaplexInstruction = tx.transaction.message.compiledInstructions?.some(
    (ix) => {
      const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
      return programId.equals(METAPLEX_PROGRAM_ID);
    }
  );

  if (hasMetaplexInstruction && txSucceeded) {
    return {
      verified: true,
      onChainData: {
        verified: true,
        recordFound: true,
        txType: "nft_mint",
        cluster,
      },
      blockTime: tx.blockTime,
      slot: tx.slot,
      cluster,
    };
  }

  // Transaction found but unrecognized program — still confirm it exists
  return {
    verified: txSucceeded,
    onChainData: {
      verified: txSucceeded,
      recordFound: true,
      txType: "unknown",
      cluster,
    },
    blockTime: tx.blockTime,
    slot: tx.slot,
    cluster,
  };
}

/**
 * Get Solana explorer URL for a transaction
 * Uses centralized network config for cluster param
 */
export function getExplorerUrl(signature: string): string {
  return getExplorerTxUrl(signature);
}

/**
 * Format lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  const connection = new Connection(SOLANA_NETWORK, "confirmed");
  const balance = await connection.getBalance(publicKey);
  return lamportsToSol(balance);
}

/**
 * Check if wallet has enough balance for transaction
 */
export async function hasEnoughBalance(publicKey: PublicKey, minSol: number = 0.001): Promise<boolean> {
  const balance = await getWalletBalance(publicKey);
  return balance >= minSol;
}
