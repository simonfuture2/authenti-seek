import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CustomWalletModal } from "./CustomWalletModal";
import { useBlockchainAudit } from "@/hooks/useBlockchainAudit";
import { getExplorerAddressUrl } from "@/lib/solana-config";

export function WalletButton() {
  const { publicKey, wallet, disconnect, connected, connecting } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const { logWalletEvent } = useBlockchainAudit();
  const prevConnectedRef = useRef(connected);

  // Track wallet connect/disconnect events
  useEffect(() => {
    const wasConnected = prevConnectedRef.current;
    prevConnectedRef.current = connected;

    if (connected && publicKey && !wasConnected) {
      // Just connected
      logWalletEvent("connect", publicKey.toBase58(), wallet?.adapter.name);
    } else if (!connected && wasConnected) {
      // Just disconnected - we don't have publicKey anymore, use placeholder
      logWalletEvent("disconnect", "disconnected", wallet?.adapter.name);
    }
  }, [connected, publicKey, wallet, logWalletEvent]);

  const handleConnect = () => {
    setModalOpen(true);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success("Address copied to clipboard");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (connecting) {
    return (
      <Button variant="outline" className="w-full" disabled>
        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Connecting...
      </Button>
    );
  }

  if (connected && publicKey) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              {wallet?.adapter.icon && (
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="h-4 w-4"
                />
              )}
              <span className="font-mono text-xs">
                {truncateAddress(publicKey.toBase58())}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
          <DropdownMenuItem onClick={handleCopyAddress}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={getExplorerAddressUrl(publicKey.toBase58())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full bg-solana-gradient text-white border-0 hover:opacity-90"
        onClick={handleConnect}
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
      <CustomWalletModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
