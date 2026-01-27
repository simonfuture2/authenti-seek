import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ExternalLink, Clock, Hash, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExplorerUrl } from "@/lib/solana";

interface OnChainVerificationProps {
  signature: string | null;
  verificationResult: {
    verified: boolean;
    onChainData: Record<string, unknown> | null;
    blockTime: number | null;
    slot: number;
  } | null;
  isLoading: boolean;
  onVerify: () => void;
}

export function OnChainVerification({
  signature,
  verificationResult,
  isLoading,
  onVerify,
}: OnChainVerificationProps) {
  if (!signature) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Hash className="h-5 w-5" />
            <p className="text-sm">No on-chain record for this certificate</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <div className="h-1 bg-solana-gradient" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Blockchain Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transaction Signature */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Solana Transaction</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono truncate">{signature}</code>
            <a
              href={getExplorerUrl(signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Verification Status */}
        {verificationResult ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${
              verificationResult.verified
                ? "bg-success/10 border-success/30"
                : "bg-destructive/10 border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {verificationResult.verified ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-success" />
                  <span className="font-semibold text-success">Verified On-Chain</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-destructive" />
                  <span className="font-semibold text-destructive">Verification Failed</span>
                </>
              )}
            </div>

            {verificationResult.verified && (
              <div className="space-y-2 text-sm">
                {verificationResult.blockTime && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Recorded:{" "}
                      {new Date(verificationResult.blockTime * 1000).toLocaleString()}
                    </span>
                  </div>
                )}
                {verificationResult.slot > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>Slot: {verificationResult.slot.toLocaleString()}</span>
                  </div>
                )}
                {verificationResult.onChainData?.hash && (
                  <div className="mt-2 p-2 rounded bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Certificate Hash</p>
                    <code className="text-xs font-mono break-all">
                      {String(verificationResult.onChainData.hash)}
                    </code>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <Button
            onClick={onVerify}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? "Verifying..." : "Verify On-Chain"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
