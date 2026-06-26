import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/errorHandler";

export interface InvisibleMintResult {
  success: boolean;
  assetId?: string;
  signature?: string;
  metadataUri?: string;
  alreadyMinted?: boolean;
}

/**
 * Invisible mint: calls the `mint-coa` edge function, which (via the platform signer)
 * uploads permanent metadata + image to Arweave and mints a compressed NFT to the
 * collector's managed wallet. No wallet popup; the platform pays the fees.
 */
export function useInvisibleMint() {
  const { toast } = useToast();
  const [isMinting, setIsMinting] = useState(false);

  const mintInvisible = useCallback(
    async (certificateId: string): Promise<InvisibleMintResult | null> => {
      setIsMinting(true);
      try {
        const { data, error } = await supabase.functions.invoke("mint-coa", {
          body: { certificateId },
        });

        // A non-2xx from the function surfaces as `error`; the body carries the detail.
        if (error) {
          const detail = (data as { error?: string } | null)?.error || error.message;
          throw new Error(detail);
        }
        if (!data?.success) {
          throw new Error(data?.error || "Mint failed");
        }

        return data as InvisibleMintResult;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Mint failed";
        logError(err, "useInvisibleMint.mintInvisible");
        toast({
          title: "Sealing didn't complete",
          description: `${message} Your credit was refunded — you can retry from your collection.`,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsMinting(false);
      }
    },
    [toast]
  );

  return { mintInvisible, isMinting };
}
