import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/errorHandler";

export interface CollectAIResult {
  name?: string;
  category?: string;
  description?: string;
  estimatedValue?: string;
  rarity?: string;
  condition?: string;
  year?: string;
  brand?: string;
  confidence?: number;
  [key: string]: unknown;
}

export function useCollectAIIdentify() {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<CollectAIResult | null>(null);

  const identify = useCallback(async (imageUrl: string): Promise<CollectAIResult | null> => {
    if (!imageUrl) {
      toast.error("Please upload a product image first");
      return null;
    }

    setIsIdentifying(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("collectai-identify", {
        body: { imageUrl, action: "identify" },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Identification failed");
      }

      const identifyResult = data.result as CollectAIResult;
      setResult(identifyResult);
      toast.success("Item identified by CollectAI!");
      return identifyResult;
    } catch (error) {
      logError(error, "useCollectAIIdentify.identify");

      if (error instanceof Error) {
        if (error.message.includes("429") || error.message.includes("Rate limit")) {
          toast.error("CollectAI is busy. Please try again shortly.");
        } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          toast.error("Please log in to use CollectAI identification.");
        } else {
          toast.error("CollectAI identification unavailable. Try again later.");
        }
      }

      return null;
    } finally {
      setIsIdentifying(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return { identify, isIdentifying, result, clearResult };
}
