import React from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { useSolPrice } from "@/hooks/useSolPrice";
import { cn } from "@/lib/utils";

interface SolPriceTickerProps {
  compact?: boolean;
  className?: string;
}

export function SolPriceTicker({ compact, className }: SolPriceTickerProps) {
  const { solPrice, isLoading, isError } = useSolPrice();

  if (isError) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 font-mono text-xs",
        compact ? "px-2 py-0.5" : "px-3 py-1",
        className
      )}
      title="Live SOL/USD price from Solscan (refreshes every 5 min)"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : (
        <>
          <TrendingUp className="h-3 w-3 text-primary" />
          <span className="text-foreground font-medium">
            SOL
          </span>
          <span className="text-muted-foreground">
            ${solPrice?.toFixed(2)}
          </span>
        </>
      )}
    </div>
  );
}
