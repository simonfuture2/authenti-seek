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
} from "@solana/web3.js";
import { getExplorerTxUrl } from "@/lib/solana-config";
import { useToast } from "@/hooks/use-toast";
import { WalletButton } from "@/components/wallet/WalletButton";

const TREASURY_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAYWB";

interface AssetLPDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId: string;
  currentFloorValue: number;
  onSuccess: () => void;
}

type DepositType = "sol" | "usdc" | "usdt";

export function AssetLPDepositModal({
  open,
  onOpenChange,
  certificateId,
  currentFloorValue,
  onSuccess,
}: AssetLPDepositModalProps) {
  const [depositType, setDepositType] = useState<DepositType>("sol");
  const [amount, setAmount] = useState("");
  const [floorValue, setFloorValue] = useState(currentFloorValue.toString());
  const [step, setStep] = useState<"input" | "sending" | "verifying" | "done">("input");
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const { solPrice, solToUsd, usdToSol } = useSolPrice();
  const { verifyDeposit, isVerifying } = useAssetLP(certificateId);
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStep("input");
      setAmount("");
      setTxSignature(null);
      setFloorValue(currentFloorValue > 0 ? currentFloorValue.toString() : "");
    }
  }, [open, currentFloorValue]);

  const amountNum = parseFloat(amount) || 0;
  const usdEquivalent =
    depositType === "sol"
      ? solPrice ? amountNum * solPrice : null
      : amountNum; // stablecoins are 1:1 USD

  const handleDeposit = async () => {
    if (!publicKey || !connected) {
      toast({ title: "Connect your wallet first", variant: "destructive" });
      return;
    }
    if (amountNum <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      setStep("sending");

      if (depositType === "sol") {
        // Build SOL transfer transaction
        const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(TREASURY_WALLET),
            lamports,
          })
        );

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
        setTxSignature(signature);

        // Verify on backend
        setStep("verifying");
        await verifyDeposit({
          certificate_id: certificateId,
          solana_signature: signature,
          deposit_type: "sol",
          amount_token: amountNum,
          amount_usd: usdEquivalent || 0,
          floor_value_usd: parseFloat(floorValue) || undefined,
        });
      } else {
        // For USDC/USDT SPL transfers, we need the user to send via their wallet
        // This is a simplified flow – in production, use @solana/spl-token
        toast({
          title: "SPL Token Transfer",
          description: `Please send ${amountNum} ${depositType.toUpperCase()} to ${TREASURY_WALLET.slice(0, 8)}... and paste the signature below.`,
        });
        // For now, prompt for manual signature entry
        const sig = prompt("Enter the Solana transaction signature after sending:");
        if (!sig) {
          setStep("input");
          return;
        }
        setTxSignature(sig);
        setStep("verifying");
        await verifyDeposit({
          certificate_id: certificateId,
          solana_signature: sig,
          deposit_type: depositType,
          amount_token: amountNum,
          amount_usd: amountNum, // stablecoins = USD
          floor_value_usd: parseFloat(floorValue) || undefined,
        });
      }

      setStep("done");
      toast({ title: "Deposit confirmed!", description: "Liquidity added to certificate." });
      onSuccess();
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to process deposit",
        variant: "destructive",
      });
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
            Back this certificate with SOL + stablecoins to establish a floor value.
          </DialogDescription>
        </DialogHeader>

        {step === "done" ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold">Deposit Confirmed!</p>
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
            {/* Floor value target */}
            <div className="space-y-2">
              <Label>Floor Value Target (USD)</Label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={floorValue}
                onChange={(e) => setFloorValue(e.target.value)}
                disabled={currentFloorValue > 0}
              />
              {currentFloorValue > 0 && (
                <p className="text-xs text-muted-foreground">
                  Floor value already set to ${currentFloorValue}
                </p>
              )}
            </div>

            {/* Deposit type */}
            <div className="space-y-2">
              <Label>Token</Label>
              <Select value={depositType} onValueChange={(v) => setDepositType(v as DepositType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sol">SOL</SelectItem>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount ({depositType.toUpperCase()})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="any"
              />
              {usdEquivalent !== null && amountNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ ${usdEquivalent.toFixed(2)} USD
                </p>
              )}
            </div>

            {/* Wallet */}
            {!connected && (
              <div className="space-y-2">
                <Label>Wallet</Label>
                <WalletButton />
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleDeposit}
              disabled={step !== "input" || amountNum <= 0 || !connected}
            >
              {step === "sending" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Transaction...</>
              ) : step === "verifying" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying On-Chain...</>
              ) : (
                `Deposit ${amountNum > 0 ? amountNum : ""} ${depositType.toUpperCase()}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
