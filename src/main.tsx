import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Mobile Wallet Adapter for Solana Mobile (Android) support
// This must be called before any wallet adapter usage
import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-standard-mobile";

registerMwa({
  appIdentity: {
    name: "AuthentiSeal",
    uri: typeof window !== "undefined" ? window.location.origin : "https://authentiseal.app",
    icon: "/favicon.ico",
  },
  authorizationCache: createDefaultAuthorizationCache(),
  chains: ["solana:devnet", "solana:mainnet"] as const,
  chainSelector: createDefaultChainSelector(),
  onWalletNotFound: createDefaultWalletNotFoundHandler(),
});

createRoot(document.getElementById("root")!).render(<App />);
