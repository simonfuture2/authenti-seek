import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { Wallet, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomWalletModal({ open, onOpenChange }: CustomWalletModalProps) {
  const { wallets, select, connect, connecting, connected, wallet } = useWallet();
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null);

  const [installedWallets, otherWallets] = useMemo(() => {
    const installed: typeof wallets = [];
    const notInstalled: typeof wallets = [];

    for (const wallet of wallets) {
      if (
        wallet.readyState === WalletReadyState.Installed ||
        wallet.readyState === WalletReadyState.Loadable
      ) {
        installed.push(wallet);
      } else {
        notInstalled.push(wallet);
      }
    }

    return [installed, notInstalled];
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
    }
  }, [connected, open, onOpenChange]);

  const handleWalletClick = useCallback(
    async (walletName: string) => {
      setSelectedWalletName(walletName);
      select(walletName as any);

      // Let wallet-adapter apply the selection before attempting connect.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      
      // Check if this is WalletConnect
      if (walletName === "WalletConnect") {
        setShowQRCode(true);
        // Trigger connect to get the URI
        try {
          await connect();
        } catch (error) {
          // Connection might fail if user cancels, that's okay
          toast.error("WalletConnect connection was cancelled or failed.");
        }
      } else {
        try {
          await connect();
        } catch (error) {
          toast.error(`Failed to connect to ${walletName}. Make sure it is installed and unlocked.`);
        }
      }

      setSelectedWalletName(null);
    },
    [select, connect]
  );

  const handleBack = useCallback(() => {
    setShowQRCode(false);
    setWalletConnectUri(null);
    setSelectedWalletName(null);
  }, []);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShowQRCode(false);
      setWalletConnectUri(null);
      setSelectedWalletName(null);
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
        </DialogHeader>

        {showQRCode ? (
          <div className="flex flex-col items-center py-6 space-y-4">
            {walletConnectUri ? (
              <>
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={walletConnectUri}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                  Scan this QR code with your mobile wallet app to connect
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
            <div className="space-y-4 py-4">
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
                        onClick={() => handleWalletClick(wallet.adapter.name)}
                      >
                        <img
                          src={wallet.adapter.icon}
                          alt={wallet.adapter.name}
                          className="h-8 w-8 rounded-lg"
                        />
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
                    More Options
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
                        onClick={() => handleWalletClick(wallet.adapter.name)}
                      >
                        <img
                          src={wallet.adapter.icon}
                          alt={wallet.adapter.name}
                          className="h-8 w-8 rounded-lg opacity-80"
                        />
                        <div className="flex flex-col items-start flex-1">
                          <span className="font-medium text-foreground/80">
                            {wallet.adapter.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {wallet.adapter.name === "WalletConnect"
                              ? "Scan QR code"
                              : "Not installed"}
                          </span>
                        </div>
                        {wallet.adapter.name !== "WalletConnect" && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    ))}
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
