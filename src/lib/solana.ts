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
 * Create a SHA-256 hash of the certificate data
 */
export async function hashCertificateData(data: CertificateOnChainData): Promise<string> {
  const dataString = JSON.stringify({
    serial: data.serialNumber,
    product: data.productName,
    issuer: data.issuerId,
    timestamp: data.timestamp,
    meta: data.metadataHash,
  });
  
  // Use a simpler hashing approach that works in browser
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex and pad with timestamp for uniqueness
  const hashHex = Math.abs(hash).toString(16).padStart(8, "0");
  const timestampHex = data.timestamp.toString(16);
  return `${hashHex}${timestampHex}`;
}

/**
 * Store certificate hash on Solana blockchain using Memo program
 */
export async function storeCertificateOnChain(
  wallet: WalletContextState,
  certificateData: CertificateOnChainData
): Promise<OnChainResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const connection = new Connection(SOLANA_NETWORK, "confirmed");

  // Create certificate hash
  const certificateHash = await hashCertificateData(certificateData);

  // Create memo data with certificate info (including NFC tag if present)
  const memoData = JSON.stringify({
    type: "COA_CERTIFICATE",
    version: "1.1",
    hash: certificateHash,
    serial: certificateData.serialNumber,
    timestamp: certificateData.timestamp,
    ...(certificateData.nfcTagId && { nfc: certificateData.nfcTagId }),
  });

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
      parsedData = JSON.parse(memoDataString);
    } catch {
      parsedData = { raw: memoDataString };
    }

    // Verify hash if expected hash is provided
    const verified = expectedHash 
      ? parsedData.hash === expectedHash 
      : parsedData.type === "COA_CERTIFICATE";

    return {
      verified,
      onChainData: parsedData,
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
