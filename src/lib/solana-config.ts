import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

/**
 * Centralized Solana network configuration.
 *
 * Set VITE_SOLANA_NETWORK to "mainnet-beta" for production deployment.
 * Defaults to "devnet" when unset or any other value.
 */

type SolanaCluster = "devnet" | "mainnet-beta";

const envNetwork = import.meta.env.VITE_SOLANA_NETWORK as string | undefined;

export const SOLANA_CLUSTER: SolanaCluster =
  envNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";

export const SOLANA_WALLET_NETWORK: WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet =
  SOLANA_CLUSTER === "mainnet-beta"
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet;

/** Full RPC endpoint for the active cluster */
export const SOLANA_RPC_ENDPOINT: string = clusterApiUrl(SOLANA_WALLET_NETWORK);

/** Whether the app is running against mainnet */
export const IS_MAINNET: boolean = SOLANA_CLUSTER === "mainnet-beta";

/** MWA chain identifiers matching the active cluster */
export const MWA_CHAINS = (
  IS_MAINNET
    ? ["solana:mainnet"] as const
    : ["solana:devnet", "solana:mainnet"] as const
);

/**
 * Build a Solana Explorer URL for a transaction signature.
 * Omits the cluster param on mainnet (explorer defaults to mainnet).
 */
export function getExplorerTxUrl(signature: string): string {
  const clusterParam = IS_MAINNET ? "" : `?cluster=${SOLANA_CLUSTER}`;
  return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
}

/**
 * Build a Solana Explorer URL for an account / mint address.
 */
export function getExplorerAddressUrl(address: string): string {
  const clusterParam = IS_MAINNET ? "" : `?cluster=${SOLANA_CLUSTER}`;
  return `https://explorer.solana.com/address/${address}${clusterParam}`;
}
