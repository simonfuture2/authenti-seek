import { IS_MAINNET, SOLANA_CLUSTER } from "@/lib/solana-config";
import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
  compact?: boolean;
  className?: string;
}

export function NetworkBadge({ compact = false, className }: NetworkBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider border",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        IS_MAINNET
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-accent/30 bg-accent/10 text-accent",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full",
          compact ? "h-1.5 w-1.5" : "h-2 w-2",
          IS_MAINNET ? "bg-primary animate-pulse" : "bg-accent",
        )}
      />
      {compact ? (IS_MAINNET ? "Main" : "Dev") : SOLANA_CLUSTER}
    </span>
  );
}
