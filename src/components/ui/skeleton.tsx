import { cn } from "@/lib/utils";

/**
 * Branded skeleton. Uses a subtle gold-tinted shimmer over the muted token
 * so loading states read as part of the AuthentiSeal identity instead of
 * generic shadcn gray.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-primary/15 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
