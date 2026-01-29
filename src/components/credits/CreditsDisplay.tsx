import React, { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { CreditsPurchaseModal } from "./CreditsPurchaseModal";

interface CreditsDisplayProps {
  compact?: boolean;
}

export function CreditsDisplay({ compact = false }: CreditsDisplayProps) {
  const { credits, isLoadingCredits } = useCredits();
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  if (compact) {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setPurchaseOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Credits</span>
          </div>
          <div className="flex items-center gap-2">
            {isLoadingCredits ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-sm font-bold gradient-text">
                {credits?.balance ?? 0}
              </span>
            )}
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </motion.button>

        <CreditsPurchaseModal open={purchaseOpen} onOpenChange={setPurchaseOpen} />
      </>
    );
  }

  return (
    <>
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Available Credits</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            {isLoadingCredits ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-3xl font-bold gradient-text">
                {credits?.balance ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              1 credit = 1 certificate or verification
            </p>
          </div>

          <Button
            onClick={() => setPurchaseOpen(true)}
            size="sm"
            className="bg-solana-gradient hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Buy
          </Button>
        </div>
      </div>

      <CreditsPurchaseModal open={purchaseOpen} onOpenChange={setPurchaseOpen} />
    </>
  );
}
