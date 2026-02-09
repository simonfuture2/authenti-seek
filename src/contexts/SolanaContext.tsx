import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { Adapter } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletConnectWalletAdapter } from "@walletconnect/solana-adapter";
import { Commitment } from "@solana/web3.js";
import { SOLANA_WALLET_NETWORK, SOLANA_RPC_ENDPOINT } from "@/lib/solana-config";

interface SolanaProviderProps {
  children: React.ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const network = SOLANA_WALLET_NETWORK;
  const endpoint = useMemo(() => SOLANA_RPC_ENDPOINT, []);
  
  const config = useMemo(
    () => ({
      commitment: "confirmed" as Commitment,
    }),
    []
  );

  // Get WalletConnect project ID from environment
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  // Initialize wallets - these adapters work on both desktop and mobile
  const wallets = useMemo((): Adapter[] => {
    const adapters: Adapter[] = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];

    // Add WalletConnect if project ID is configured
    if (walletConnectProjectId) {
      adapters.push(
        new WalletConnectWalletAdapter({
          network,
          options: {
            projectId: walletConnectProjectId,
            metadata: {
              name: "AuthentiSeal",
              description: "Certificate of Authenticity DApp for Solana",
              url: typeof window !== "undefined" ? window.location.origin : "https://authentiseal.app",
              icons: [typeof window !== "undefined" ? `${window.location.origin}/favicon.ico` : ""],
            },
          },
        })
      );
    }

    return adapters;
  }, [network, walletConnectProjectId]);

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
