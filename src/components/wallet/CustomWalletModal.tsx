import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { Wallet, ExternalLink, ArrowLeft, Loader2, Smartphone, QrCode, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CustomWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Detect if running on a touch device (mobile/tablet) or lacks extension support
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for touch capability
  const hasTouch = (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints for older IE/Edge
    navigator.msMaxTouchPoints > 0
  );
  
  // Also detect iPad specifically (iPadOS 13+ reports as Mac)
  const isIPad = /iPad/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  
  // Detect if we're in a mobile browser that doesn't support extensions
  const isMobileBrowser = /Mobile|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return hasTouch || isIPad || isMobileBrowser;
}

// Get the current page URL for deep linking
function getCurrentUrl(): string {
  if (typeof window === "undefined") return "";
  return encodeURIComponent(window.location.href);
}

function hasInjectedProvider(walletName: string): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (walletName === "Phantom") return !!w.solana?.isPhantom;
  if (walletName === "Solflare") return !!w.solflare?.isSolflare || !!w.solana?.isSolflare;
  return false;
}

// Deep link URLs for mobile wallet apps
const WALLET_DEEP_LINKS: Record<string, (url: string) => string> = {
  Phantom: (url) => `https://phantom.app/ul/browse/${url}?ref=${url}`,
  Solflare: (url) => `https://solflare.com/ul/v1/browse/${url}?ref=${url}`,
};

export function CustomWalletModal({ open, onOpenChange }: CustomWalletModalProps) {
  const { wallets, select, connect, connecting, connected, wallet } = useWallet();
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Check for touch device on mount
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  // Separate WalletConnect adapter from other wallets
  const { walletConnectAdapter, installedWallets, otherWallets } = useMemo(() => {
    const installed: typeof wallets = [];
    const notInstalled: typeof wallets = [];
    let wcAdapter: (typeof wallets)[0] | null = null;

    for (const wallet of wallets) {
      if (wallet.adapter.name === "WalletConnect") {
        wcAdapter = wallet;
        continue;
      }
      
      if (
        wallet.readyState === WalletReadyState.Installed ||
        wallet.readyState === WalletReadyState.Loadable
      ) {
        installed.push(wallet);
      } else {
        notInstalled.push(wallet);
      }
    }

    return { 
      walletConnectAdapter: wcAdapter, 
      installedWallets: installed, 
      otherWallets: notInstalled 
    };
  }, [wallets]);

  // Listen for WalletConnect URI
  useEffect(() => {
    if (wallet?.adapter.name === "WalletConnect" && showQRCode) {
      const adapter = wallet.adapter as any;
      
      const handleUri = (uri: string) => {
        setWalletConnectUri(uri);
      };

      // Check if adapter has URI already
      if (adapter.uri) {
        setWalletConnectUri(adapter.uri);
      }

      // Listen for URI events
      adapter.on?.("uri", handleUri);

      return () => {
        adapter.off?.("uri", handleUri);
      };
    }
  }, [wallet, showQRCode]);

  // Close modal when connected
  useEffect(() => {
    if (connected && open) {
      onOpenChange(false);
      setShowQRCode(false);
      setWalletConnectUri(null);
      setSelectedWalletName(null);
      setCopiedUri(false);
    }
  }, [connected, open, onOpenChange]);

  const handleCopyUri = useCallback(() => {
    if (walletConnectUri) {
      navigator.clipboard.writeText(walletConnectUri);
      setCopiedUri(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedUri(false), 2000);
    }
  }, [walletConnectUri]);

  const handleWalletConnectClick = useCallback(async () => {
    if (!walletConnectAdapter) return;
    
    setSelectedWalletName("WalletConnect");
    select("WalletConnect" as any);
    
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    
    setShowQRCode(true);
    try {
      await connect();
    } catch (error) {
      // Connection might fail if user cancels, that's okay
      toast.error("WalletConnect connection was cancelled or failed.");
    }
    setSelectedWalletName(null);
  }, [walletConnectAdapter, select, connect]);

  const handleWalletClick = useCallback(
    async (walletName: string, readyState: WalletReadyState) => {
      // On touch devices, prefer opening the installed wallet app via universal link
      // when there is no injected provider available in this browser.
      if (isTouch && walletName !== "WalletConnect") {
        const deepLinkFn = WALLET_DEEP_LINKS[walletName];
        const injected = hasInjectedProvider(walletName);
        if (deepLinkFn && !injected) {
          const currentUrl = getCurrentUrl();
          const deepLink = deepLinkFn(currentUrl);
          toast.info(`Opening ${walletName} app...`, {
            description: "If it doesn't open, ensure the wallet app is installed and try again.",
          });
          // Must be triggered by a user gesture (button click) for iOS to allow it.
          window.location.assign(deepLink);
          return;
        }
      }

      setSelectedWalletName(walletName);
      select(walletName as any);

      // Let wallet-adapter apply the selection before attempting connect.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      
      if (
        readyState === WalletReadyState.Installed ||
        readyState === WalletReadyState.Loadable
      ) {
        // Wallet is installed, try to connect directly
        try {
          await connect();
        } catch (error) {
          toast.error(`Failed to connect to ${walletName}. Make sure it is installed and unlocked.`);
        }
      } else {
        // Desktop with uninstalled wallet - open install page
        toast.info(`${walletName} is not installed`, {
          description: "Opening the download page...",
        });
      }

      setSelectedWalletName(null);
    },
    [select, connect, isTouch]
  );

  const handleBack = useCallback(() => {
    setShowQRCode(false);
    setWalletConnectUri(null);
    setSelectedWalletName(null);
    setCopiedUri(false);
  }, []);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShowQRCode(false);
      setWalletConnectUri(null);
      setSelectedWalletName(null);
      setCopiedUri(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {showQRCode && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-1"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="p-2 rounded-lg bg-solana-gradient">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            {showQRCode ? "Scan QR Code" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Connect your Solana wallet to interact with the application
          </DialogDescription>
        </DialogHeader>

        {showQRCode ? (
          <div className="flex flex-col items-center py-4 space-y-4">
            {walletConnectUri ? (
              <>
                <div className="p-4 bg-white rounded-xl shadow-lg">
                  <QRCodeSVG
                    value={walletConnectUri}
                    size={220}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                
                {/* Step-by-step instructions */}
                <div className="w-full space-y-3 px-2">
                  <p className="text-sm font-medium text-foreground">Connect with your phone:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Open your wallet app on your <strong>phone</strong> (Phantom, Solflare)</li>
                    <li>Tap the scan/QR or WalletConnect button in the app</li>
                    <li>Scan this QR code to connect</li>
                    <li>Approve transactions on your phone when prompted</li>
                  </ol>
                </div>

                {/* Copy Link Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUri}
                  className="gap-2"
                >
                  {copiedUri ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                {/* Wallet compatibility note */}
                <p className="text-xs text-muted-foreground text-center">
                  Works with: Phantom, Solflare & more
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Generating QR code...
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* WalletConnect Recommended Section for Touch Devices */}
            {isTouch && walletConnectAdapter && (
              <div className="mb-4">
                <div className="relative p-[1px] rounded-xl bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#9945FF]">
                  <div className="bg-card rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Recommended for iPad & Tablets
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                        Use Phone
                      </Badge>
                    </div>
                    <Button
                      className={cn(
                        "w-full justify-start gap-3 h-14 px-4",
                        "bg-solana-gradient hover:opacity-90",
                        "transition-all duration-200"
                      )}
                      onClick={handleWalletConnectClick}
                      disabled={connecting && selectedWalletName === "WalletConnect"}
                    >
                      {connecting && selectedWalletName === "WalletConnect" ? (
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      ) : (
                        <div className="p-1.5 bg-white/20 rounded-lg">
                          <QrCode className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-white">
                          Connect via Phone
                        </span>
                        <span className="text-xs text-white/80">
                          Scan QR with Phantom or Solflare app
                        </span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Separator for touch devices */}
            {isTouch && walletConnectAdapter && (otherWallets.length > 0 || installedWallets.length > 0) && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Or open directly
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <div className="space-y-4 py-2">
              {installedWallets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Available Wallets
                  </p>
                  <div className="space-y-2">
                    {installedWallets.map((wallet) => (
                      <Button
                        key={wallet.adapter.name}
                        variant="outline"
                        className={cn(
                          "w-full justify-start gap-3 h-14 px-4",
                          "bg-muted/50 border-border hover:bg-muted hover:border-primary/50",
                          "transition-all duration-200"
                        )}
                        onClick={() => handleWalletClick(wallet.adapter.name, wallet.readyState)}
                        disabled={connecting && selectedWalletName === wallet.adapter.name}
                      >
                        {connecting && selectedWalletName === wallet.adapter.name ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <img
                            src={wallet.adapter.icon}
                            alt={wallet.adapter.name}
                            className="h-8 w-8 rounded-lg"
                          />
                        )}
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-foreground">
                            {wallet.adapter.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {wallet.readyState === WalletReadyState.Installed
                              ? "Detected"
                              : "Available"}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {otherWallets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {isTouch ? "Mobile Wallets" : "More Options"}
                  </p>
                  <div className="space-y-2">
                    {otherWallets.map((wallet) => (
                      <Button
                        key={wallet.adapter.name}
                        variant="outline"
                        className={cn(
                          "w-full justify-start gap-3 h-14 px-4",
                          "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border",
                          "transition-all duration-200"
                        )}
                        onClick={() => handleWalletClick(wallet.adapter.name, wallet.readyState)}
                        disabled={connecting && selectedWalletName === wallet.adapter.name}
                      >
                        {connecting && selectedWalletName === wallet.adapter.name ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <img
                            src={wallet.adapter.icon}
                            alt={wallet.adapter.name}
                            className="h-8 w-8 rounded-lg opacity-80"
                          />
                        )}
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-medium text-foreground/80">
                            {wallet.adapter.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isTouch ? "Open in app" : "Not installed"}
                          </span>
                        </div>
                        {!isTouch && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        )}
                        {isTouch && (
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    ))}

                    {/* Show WalletConnect in More Options on desktop */}
                    {!isTouch && walletConnectAdapter && (
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start gap-3 h-14 px-4",
                          "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border",
                          "transition-all duration-200"
                        )}
                        onClick={handleWalletConnectClick}
                        disabled={connecting && selectedWalletName === "WalletConnect"}
                      >
                        {connecting && selectedWalletName === "WalletConnect" ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <img
                            src={walletConnectAdapter.adapter.icon}
                            alt="WalletConnect"
                            className="h-8 w-8 rounded-lg opacity-80"
                          />
                        )}
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-medium text-foreground/80">
                            WalletConnect
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Scan QR code
                          </span>
                        </div>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {wallets.length === 0 && (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No wallets found. Please install a Solana wallet.
                  </p>
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                New to Solana?{" "}
                <a
                  href="https://phantom.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Get Phantom
                </a>
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
