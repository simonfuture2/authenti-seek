import React from "react";
import { motion } from "framer-motion";
import { Image, Lock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { MINTING_COSTS, MintingMode } from "@/lib/metaplex";
import { useSolPrice } from "@/hooks/useSolPrice";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MintModeSelectorProps {
  value: MintingMode;
  onChange: (mode: MintingMode) => void;
  disabled?: boolean;
}

export function MintModeSelector({
  value,
  onChange,
  disabled,
}: MintModeSelectorProps) {
  const { solToUsd } = useSolPrice();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Minting Mode</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p className="text-sm">
                <strong>NFT Mode:</strong> Creates a visual NFT with your certificate image visible in wallets like Phantom.<br /><br />
                <strong>Privacy Memo:</strong> Stores only text/hash data on-chain. Lower cost, but no visual NFT.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* NFT Mode */}
        <motion.button
          type="button"
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          onClick={() => !disabled && onChange("nft")}
          disabled={disabled}
          className={cn(
            "relative p-4 rounded-xl border-2 text-left transition-all",
            value === "nft"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                value === "nft"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Image className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Full NFT</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visual in wallets
              </p>
              <p className="text-xs font-mono text-primary mt-1">
                ~{MINTING_COSTS.nft.solAmount} SOL
                {solToUsd(MINTING_COSTS.nft.solAmount) && (
                  <span className="text-muted-foreground ml-1">
                    ({solToUsd(MINTING_COSTS.nft.solAmount)})
                  </span>
                )}
              </p>
            </div>
          </div>
          {value === "nft" && (
            <motion.div
              layoutId="mint-mode-indicator"
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
            />
          )}
        </motion.button>

        {/* Privacy Memo Mode */}
        <motion.button
          type="button"
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          onClick={() => !disabled && onChange("memo")}
          disabled={disabled}
          className={cn(
            "relative p-4 rounded-xl border-2 text-left transition-all",
            value === "memo"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                value === "memo"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Privacy Memo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Text/hash only
              </p>
              <p className="text-xs font-mono text-success mt-1">
                ~{MINTING_COSTS.memo.solAmount} SOL
                {solToUsd(MINTING_COSTS.memo.solAmount) && (
                  <span className="text-muted-foreground ml-1">
                    ({solToUsd(MINTING_COSTS.memo.solAmount)})
                  </span>
                )}
              </p>
            </div>
          </div>
          {value === "memo" && (
            <motion.div
              layoutId="mint-mode-indicator"
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
            />
          )}
        </motion.button>
      </div>

      {/* Fee Summary */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated Fee:</span>
          <span className="font-mono text-sm font-medium">
            {value === "nft"
              ? `~${MINTING_COSTS.nft.solAmount} SOL`
              : `~${MINTING_COSTS.memo.solAmount} SOL`}
            {solToUsd(value === "nft" ? MINTING_COSTS.nft.solAmount : MINTING_COSTS.memo.solAmount) && (
              <span className="text-muted-foreground ml-1">
                ({solToUsd(value === "nft" ? MINTING_COSTS.nft.solAmount : MINTING_COSTS.memo.solAmount)})
              </span>
            )}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {value === "nft"
            ? "Creates a visual NFT that displays in Phantom, Solflare, and other wallets."
            : "Stores certificate hash on-chain for verification. More private, lower cost."}
        </p>
      </div>
    </div>
  );
}
