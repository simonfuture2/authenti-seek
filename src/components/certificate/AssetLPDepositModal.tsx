import React, { useState, useEffect } from "react";
import { Loader2, ExternalLink, Droplets } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAssetLP } from "@/hooks/useAssetLP";
import { useSolPrice } from "@/hooks/useSolPrice";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { getExplorerTxUrl, DEFAULT_COMPUTE_UNIT_LIMIT, DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS } from "@/lib/solana-config";
import { useToast } from "@/hooks/use-toast";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";

const TREASURY_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAYWB";

interface AssetLPDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId: string;
  currentFloorValue: number;
  onSuccess: () => void;
}

type PairType = "sol_usdc" | "sol_usdt";
type DepositStep = "sol" | "stablecoin";

export function AssetLPDepositModal({
  open,
  onOpenChange,
  certificateId,
  currentFloorValue,
  onSuccess,
}: AssetLPDepositModalProps) {
  const [pair, setPair] = useState<PairType>("sol_usdc");
  const [floorValue, setFloorValue] = useState(currentFloorValue.toString());
  const [step, setStep] = useState<"input" | "sending_sol" | "verifying_sol" | "sending_stable" | "verifying_stable" | "done">("input");
  const [depositStep, setDepositStep] = useState<DepositStep>("sol");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [solTxDone, setSolTxDone] = useState(false);

  const { solPrice, usdToSol } = useSolPrice();
  const { verifyDeposit } = useAssetLP(certificateId);
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const { credits, refetchCredits } = useCredits();

  const isFirstLP = currentFloorValue === 0;
  const creditCost = isFirstLP ? 20 : 5;
  const hasEnoughCredits = (credits?.balance || 0) >= creditCost;

  useEffect(() => {
    if (open) {
      setStep("input");
      setDepositStep("sol");
      setTxSignature(null);
      setSolTxDone(false);
      setFloorValue(currentFloorValue > 0 ? currentFloorValue.toString() : "");
    }
  }, [open, currentFloorValue]);

  const floorNum = parseFloat(floorValue) || 0;
  const halfUsd = floorNum / 2;
  const stablecoinType = pair === "sol_usdc" ? "usdc" : "usdt";
  const stablecoinLabel = stablecoinType.toUpperCase();
  const solAmount = usdToSol ? usdToSol(halfUsd) : null;
  const stablecoinAmount = halfUsd;

  const handleDepositSol = async () => {
    if (!publicKey || !connected) {
      toast({ title: "Connect your wallet first", variant: "destructive" });
      return;
    }
    if (!solAmount || solAmount <= 0) return;
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${creditCost} credits to ${isFirstLP ? "create" : "add to"} an LP pair. You have ${credits?.balance || 0}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Deduct credits first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: creditCost,
        p_transaction_type: "certificate_creation" as const,
        p_description: isFirstLP ? "Asset LP creation (20 credits)" : "Asset LP additional deposit (5 credits)",
        p_reference_id: certificateId,
      });

      if (deductError) throw deductError;
      const result = deductResult?.[0];
      if (!result?.success) {
        toast({ title: "Insufficient Credits", description: result?.message || "Not enough credits", variant: "destructive" });
        return;
      }
      refetchCredits();

      setStep("sending_sol");
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: DEFAULT_COMPUTE_UNIT_LIMIT }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS }),
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TREASURY_WALLET),
          lamports,
        })
      );

      let signature: string;
      try {
        signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
      } catch (txError: any) {
        // Refund credits on failed Solana transaction
        console.warn("SOL tx failed, refunding credits...");
        await supabase.rpc("add_credits", {
          p_user_id: user.id,
          p_amount: creditCost,
          p_payment_method: "sol" as const,
          p_description: `Refund: LP deposit SOL tx failed - ${txError.message?.slice(0, 80)}`,
        });
        refetchCredits();
        throw txError;
      }

      setTxSignature(signature);

      setStep("verifying_sol");
      await verifyDeposit({
        certificate_id: certificateId,
        solana_signature: signature,
        deposit_type: "sol",
        amount_token: solAmount,
        amount_usd: halfUsd,
        floor_value_usd: floorNum || undefined,
      });

      setSolTxDone(true);
      setDepositStep("stablecoin");
      setStep("input");
      toast({ title: "SOL deposit confirmed!", description: `Now deposit ${stablecoinLabel}.` });
    } catch (error: any) {
      console.error("SOL deposit error:", error);
      toast({ title: "SOL Deposit Failed", description: error.message, variant: "destructive" });
      setStep("input");
    }
  };

  const handleDepositStablecoin = async () => {
    if (!publicKey || !connected) {
      toast({ title: "Connect your wallet first", variant: "destructive" });
      return;
    }
    if (stablecoinAmount <= 0) return;

    try {
      // SPL token transfer – manual signature for now
      toast({
        title: `Send ${stablecoinLabel}`,
        description: `Send ${stablecoinAmount.toFixed(2)} ${stablecoinLabel} to ${TREASURY_WALLET.slice(0, 8)}... then paste the tx signature.`,
      });
      const sig = prompt(`Enter the ${stablecoinLabel} transaction signature:`);
      if (!sig) return;

      setStep("verifying_stable");
      setTxSignature(sig);

      await verifyDeposit({
        certificate_id: certificateId,
        solana_signature: sig,
        deposit_type: stablecoinType,
        amount_token: stablecoinAmount,
        amount_usd: stablecoinAmount,
        floor_value_usd: floorNum || undefined,
      });

      setStep("done");
      toast({ title: "Liquidity pair complete!", description: "Both deposits confirmed." });
      onSuccess();
    } catch (error: any) {
      console.error("Stablecoin deposit error:", error);
      toast({ title: "Deposit Failed", description: error.message, variant: "destructive" });
      setStep("input");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Add Liquidity
          </DialogTitle>
          <DialogDescription>
            Back this certificate with a SOL + stablecoin pair to establish a floor value.
          </DialogDescription>
        </DialogHeader>

        {step === "done" ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold">Liquidity Pair Complete!</p>
            {txSignature && (
              <a
                href={getExplorerTxUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pair selector */}
            <div className="space-y-2">
              <Label>Liquidity Pair</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPair("sol_usdc")}
                  disabled={solTxDone}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    pair === "sol_usdc"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                  } ${solTxDone ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  SOL / USDC
                </button>
                <button
                  type="button"
                  onClick={() => setPair("sol_usdt")}
                  disabled={solTxDone}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    pair === "sol_usdt"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                  } ${solTxDone ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  SOL / USDT
                </button>
              </div>
            </div>

            {/* Floor value target */}
            <div className="space-y-2">
              <Label>Floor Value Target (USD)</Label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={floorValue}
                onChange={(e) => setFloorValue(e.target.value)}
                disabled={currentFloorValue > 0 || solTxDone}
              />
              {currentFloorValue > 0 && (
                <p className="text-xs text-muted-foreground">
                  Floor value already set to ${currentFloorValue}
                </p>
              )}
            </div>

            {/* Auto-calculated pair breakdown */}
            {floorNum > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Required Deposits (50/50 split)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-2 rounded border ${depositStep === "sol" && !solTxDone ? "border-primary bg-primary/5" : solTxDone ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <p className="text-xs text-muted-foreground">SOL (50%)</p>
                    <p className="font-mono font-semibold text-sm">
                      {solAmount !== null ? `${solAmount.toFixed(4)} SOL` : "Loading..."}
                    </p>
                    <p className="text-xs text-muted-foreground">${halfUsd.toFixed(2)}</p>
                    {solTxDone && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-primary/30 text-primary">
                        ✓ Done
                      </Badge>
                    )}
                  </div>
                  <div className={`p-2 rounded border ${depositStep === "stablecoin" && solTxDone ? "border-primary bg-primary/5" : "border-border"}`}>
                    <p className="text-xs text-muted-foreground">{stablecoinLabel} (50%)</p>
                    <p className="font-mono font-semibold text-sm">
                      {stablecoinAmount.toFixed(2)} {stablecoinLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">${halfUsd.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Credit cost notice */}
            {floorNum > 0 && (
              <div className={`p-3 rounded-lg border text-sm ${hasEnoughCredits ? "border-border bg-muted/30" : "border-destructive/30 bg-destructive/5"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Credit Cost</span>
                  <span className="font-semibold">{creditCost} credits</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className={`font-semibold ${hasEnoughCredits ? "" : "text-destructive"}`}>
                    {credits?.balance || 0} credits
                  </span>
                </div>
                {!hasEnoughCredits && (
                  <p className="text-xs text-destructive mt-2">
                    Insufficient credits. Purchase more to continue.
                  </p>
                )}
              </div>
            )}

            {/* Wallet */}
            {!connected && (
              <div className="space-y-2">
                <Label>Wallet</Label>
                <WalletButton />
              </div>
            )}

            {/* Deposit buttons */}
            {floorNum > 0 && connected && (
              <>
                {!solTxDone ? (
                  <Button
                    className="w-full"
                    onClick={handleDepositSol}
                    disabled={step !== "input" || !solAmount || solAmount <= 0 || !hasEnoughCredits}
                  >
                    {step === "sending_sol" ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending SOL...</>
                    ) : step === "verifying_sol" ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying SOL...</>
                    ) : (
                      `Step 1: Deposit ${solAmount?.toFixed(4) || "—"} SOL`
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleDepositStablecoin}
                    disabled={step !== "input"}
                  >
                    {step === "verifying_stable" ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying {stablecoinLabel}...</>
                    ) : (
                      `Step 2: Deposit ${stablecoinAmount.toFixed(2)} ${stablecoinLabel}`
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
