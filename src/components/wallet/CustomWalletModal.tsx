import React, { useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { X, Wallet, ExternalLink } from "lucide-react";
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
  const { wallets, select } = useWallet();

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

  const handleWalletClick = useCallback(
    (walletName: string) => {
      select(walletName as any);
      onOpenChange(false);
    },
    [select, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-lg bg-solana-gradient">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            Connect Wallet
          </DialogTitle>
        </DialogHeader>

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
                        Not installed
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
      </DialogContent>
    </Dialog>
  );
}
