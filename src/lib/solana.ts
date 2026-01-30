import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

// Solana Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// Connection to Solana devnet (switch to mainnet-beta for production)
const SOLANA_NETWORK = "https://api.devnet.solana.com";

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

  // Create transaction
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: wallet.publicKey,
  }).add(memoInstruction);

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
}> {
  const connection = new Connection(SOLANA_NETWORK, "confirmed");

  try {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { verified: false, onChainData: null, blockTime: null, slot: 0 };
    }

    // Extract memo data from transaction
    const memoInstruction = tx.transaction.message.compiledInstructions?.find(
      (ix) => {
        const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex];
        return programId.equals(MEMO_PROGRAM_ID);
      }
    );

    if (!memoInstruction) {
      return { verified: false, onChainData: null, blockTime: tx.blockTime, slot: tx.slot };
    }

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
        // Legacy format compatibility
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

    // Return sanitized data - only include verification status
    // Do NOT expose raw hash or internal data structures
    return {
      verified,
      onChainData: { 
        verified,
        recordFound: true,
      },
      blockTime: tx.blockTime,
      slot: tx.slot,
    };
  } catch {
    // Error handled silently - verification failed
    return { verified: false, onChainData: null, blockTime: null, slot: 0 };
  }
}

/**
 * Get Solana explorer URL for a transaction
 */
export function getExplorerUrl(signature: string, cluster: "devnet" | "mainnet-beta" = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
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
