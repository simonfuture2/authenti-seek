import React, { useState } from "react";
import { IS_MAINNET } from "@/lib/solana-config";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Loader2,
  CheckCircle,
  Wallet,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useCredits, CreditPackage } from "@/hooks/useCredits";
import { useSolPrice } from "@/hooks/useSolPrice";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useToast } from "@/hooks/use-toast";

// Treasury wallet for receiving payments
const TREASURY_WALLET = new PublicKey(
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAYWB"
);

interface CreditsPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditsPurchaseModal({
  open,
  onOpenChange,
}: CreditsPurchaseModalProps) {
  const { packages, isLoadingPackages, purchaseWithSol } = useCredits();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const { solToUsd, solPrice } = useSolPrice();

  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(
    null
  );
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPackage || !connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to make a purchase.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPackage.price_sol) {
      toast({
        title: "Price Not Available",
        description: "SOL price not set for this package.",
        variant: "destructive",
      });
      return;
    }

    setIsPurchasing(true);

    try {
      // Create transfer transaction
      const lamports = Math.floor(selectedPackage.price_sol * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_WALLET,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      // Verify with backend and add credits
      await purchaseWithSol.mutateAsync({
        packageId: selectedPackage.id,
        transactionSignature: signature,
        walletAddress: publicKey.toBase58(),
      });

      setPurchaseSuccess(true);

      // Close modal after success
      setTimeout(() => {
        setPurchaseSuccess(false);
        setSelectedPackage(null);
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-6 w-6 text-primary" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            Buy credits to create certificates and verify products. Pay with
            Solana.
            {solPrice && (
              <span className="block mt-1 text-xs font-mono text-primary">
                SOL/USD: ${solPrice.toFixed(2)} (live from Solscan)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {purchaseSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Purchase Complete!</h3>
              <p className="text-muted-foreground">
                Your credits have been added to your account.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="packages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Wallet Connection */}
              {!connected && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-5 w-5 text-warning mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-warning">
                        Connect Your Wallet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You need to connect a Solana wallet to purchase credits
                        with SOL.
                      </p>
                      <div className="mt-3">
                        <WalletButton />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Package Selection */}
              <div className="space-y-3">
                <h4 className="font-medium">Select a Package</h4>
                {isLoadingPackages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {packages?.map((pkg) => (
                      <motion.button
                        key={pkg.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          selectedPackage?.id === pkg.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 bg-muted/30"
                        }`}
                      >
                        {pkg.is_popular && (
                          <Badge className="absolute -top-2 right-4 bg-solana-gradient text-white border-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Most Popular
                          </Badge>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-semibold text-lg">{pkg.name}</h5>
                            <p className="text-sm text-muted-foreground">
                              {pkg.credits} credits
                            </p>
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold gradient-text">
                              {pkg.price_sol} SOL
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {pkg.price_sol && solToUsd(pkg.price_sol)
                                ? solToUsd(pkg.price_sol)
                                : `$${pkg.price_usd}`}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Network Warning */}
              {!IS_MAINNET && (
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Currently on Devnet. Use test SOL from a{" "}
                    <a
                      href="https://faucet.solana.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Solana faucet
                    </a>
                    .
                  </span>
                </div>
              </div>
              )}

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                disabled={!selectedPackage || !connected || isPurchasing}
                className="w-full bg-solana-gradient hover:opacity-90"
                size="lg"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Coins className="mr-2 h-5 w-5" />
                    {selectedPackage
                      ? `Pay ${selectedPackage.price_sol} SOL${selectedPackage.price_sol && solToUsd(selectedPackage.price_sol) ? ` (${solToUsd(selectedPackage.price_sol)})` : ""}`
                      : "Select a Package"}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
