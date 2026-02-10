import React, { useState } from "react";
import { TrendingUp, Droplets, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAssetLP, LPDeposit } from "@/hooks/useAssetLP";
import { useSolPrice } from "@/hooks/useSolPrice";
import { AssetLPDepositModal } from "./AssetLPDepositModal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AssetLPPanelProps {
  certificateId: string;
  isOwner?: boolean;
  className?: string;
}

export function AssetLPPanel({ certificateId, isOwner = false, className }: AssetLPPanelProps) {
  const [showDeposits, setShowDeposits] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const {
    summary,
    deposits,
    isLoading,
    solValueUsd,
    stablecoinValueUsd,
    totalBackedValueUsd,
    floorProgress,
    refetch,
  } = useAssetLP(certificateId);

  if (isLoading) return null;

  // If no LP and not owner, don't show anything
  if (!summary && !isOwner) return null;

  return (
    <div className={cn("p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Asset LP</span>
        </div>
        {summary && (
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            Floor ${summary.floor_value_usd.toLocaleString()}
          </Badge>
        )}
      </div>

      {summary ? (
        <>
          {/* Live backed value */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Backed Value</span>
              <span className="font-bold text-primary text-lg">
                ${totalBackedValueUsd.toFixed(2)}
              </span>
            </div>
            <Progress value={floorProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {floorProgress.toFixed(0)}% of floor target
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">SOL (dynamic)</p>
              <p className="font-mono font-medium">
                {summary.total_sol.toFixed(4)} SOL
              </p>
              <p className="text-primary font-medium">
                ${solValueUsd.toFixed(2)}
              </p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">Stablecoins</p>
              <p className="font-mono font-medium">
                {summary.total_usdc > 0 && `${summary.total_usdc.toFixed(2)} USDC`}
                {summary.total_usdc > 0 && summary.total_usdt > 0 && " + "}
                {summary.total_usdt > 0 && `${summary.total_usdt.toFixed(2)} USDT`}
                {summary.total_usdc === 0 && summary.total_usdt === 0 && "—"}
              </p>
              <p className="text-primary font-medium">
                ${stablecoinValueUsd.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Deposit history toggle */}
          {deposits.length > 0 && (
            <button
              onClick={() => setShowDeposits(!showDeposits)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showDeposits ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {deposits.length} deposit{deposits.length !== 1 ? "s" : ""}
            </button>
          )}

          {showDeposits && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {deposits.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {d.deposit_type.toUpperCase()}
                    </Badge>
                    <span className="font-mono">{d.amount_token}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(d.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No liquidity backing yet. Add SOL + stablecoin to establish a floor value.
        </p>
      )}

      {/* Add Liquidity button (issuer only) */}
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          className="w-full border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setDepositModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Liquidity
        </Button>
      )}

      <AssetLPDepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        certificateId={certificateId}
        currentFloorValue={summary?.floor_value_usd || 0}
        onSuccess={refetch}
      />
    </div>
  );
}
