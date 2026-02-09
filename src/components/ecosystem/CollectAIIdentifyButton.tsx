import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ScanSearch, Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CollectAIResult } from "@/hooks/useCollectAIIdentify";

interface CollectAIIdentifyButtonProps {
  onIdentify: () => void;
  isIdentifying: boolean;
  result: CollectAIResult | null;
  onClearResult: () => void;
  onApplyResult?: (result: CollectAIResult) => void;
  disabled?: boolean;
  hasImage: boolean;
}

export function CollectAIIdentifyButton({
  onIdentify,
  isIdentifying,
  result,
  onClearResult,
  onApplyResult,
  disabled,
  hasImage,
}: CollectAIIdentifyButtonProps) {
  if (!hasImage && !result) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">CollectAI Identify</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            Beta
          </Badge>
        </div>
        {hasImage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onIdentify}
            disabled={disabled || isIdentifying || !hasImage}
            className="h-7 text-xs gap-1"
          >
            {isIdentifying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {isIdentifying ? "Identifying..." : "Auto-Identify"}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanSearch className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">
                    CollectAI Result
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearResult}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.name && (
                  <ResultField label="Name" value={result.name} />
                )}
                {result.category && (
                  <ResultField label="Category" value={result.category} />
                )}
                {result.brand && (
                  <ResultField label="Brand" value={result.brand} />
                )}
                {result.year && (
                  <ResultField label="Year" value={result.year} />
                )}
                {result.rarity && (
                  <ResultField label="Rarity" value={result.rarity} />
                )}
                {result.condition && (
                  <ResultField label="Condition" value={result.condition} />
                )}
                {result.estimatedValue && (
                  <ResultField
                    label="Est. Value"
                    value={result.estimatedValue}
                  />
                )}
                {result.confidence !== undefined && (
                  <ResultField
                    label="Confidence"
                    value={`${Math.round(result.confidence * 100)}%`}
                  />
                )}
              </div>

              {result.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {result.description}
                </p>
              )}

              {onApplyResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyResult(result)}
                  className="w-full gap-1 text-xs"
                >
                  <ArrowRight className="h-3 w-3" />
                  Apply to Certificate
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
