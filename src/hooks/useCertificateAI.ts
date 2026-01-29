import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/errorHandler";

type AIAction = 
  | "generate_description"
  | "analyze_authenticity"
  | "generate_seal_design"
  | "generate_seal_image"
  | "enhance_certificate";

interface AuthenticityAnalysis {
  score: number;
  confidence: "high" | "medium" | "low";
  factors: string[];
  recommendation: string;
}

interface SealDesign {
  pattern: string;
  symbolism: string;
  colorAccent: string;
  tagline: string;
}

interface SealImage {
  imageUrl: string;
}

interface CertificateEnhancement {
  headline: string;
  subtitle: string;
  qualityMarkers: string[];
}

interface AIRequestParams {
  productName?: string;
  productCategory?: string;
  productImageUrl?: string;
  existingDescription?: string;
  serialNumber?: string;
  sealStyle?: string;
}

export function useCertificateAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const callAI = useCallback(async <T>(
    action: AIAction,
    params: AIRequestParams,
    setLoadingState?: (loading: boolean) => void
  ): Promise<T | null> => {
    const setLoading = setLoadingState || setIsLoading;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("certificate-ai", {
        body: { action, ...params },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "AI request failed");
      }

      return data.result as T;
    } catch (error) {
      logError(error, `useCertificateAI.${action}`);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("429") || error.message.includes("Rate limit")) {
          toast.error("AI is busy. Please try again in a moment.");
        } else if (error.message.includes("402") || error.message.includes("credits")) {
          toast.error("AI usage limit reached. Please check your account.");
        } else {
          toast.error("AI feature temporarily unavailable");
        }
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDescription = useCallback(
    async (params: AIRequestParams): Promise<string | null> => {
      const result = await callAI<string>("generate_description", params);
      if (result) {
        toast.success("AI description generated!");
      }
      return result;
    },
    [callAI]
  );

  const analyzeAuthenticity = useCallback(
    async (params: AIRequestParams): Promise<AuthenticityAnalysis | null> => {
      const result = await callAI<AuthenticityAnalysis>("analyze_authenticity", params);
      if (result) {
        toast.success("Authenticity analysis complete!");
      }
      return result;
    },
    [callAI]
  );

  const generateSealDesign = useCallback(
    async (params: AIRequestParams): Promise<SealDesign | null> => {
      const result = await callAI<SealDesign>("generate_seal_design", params);
      if (result) {
        toast.success("Seal design generated!");
      }
      return result;
    },
    [callAI]
  );

  const generateSealImage = useCallback(
    async (params: AIRequestParams): Promise<string | null> => {
      setIsGeneratingImage(true);
      try {
        const result = await callAI<SealImage>(
          "generate_seal_image", 
          params,
          setIsGeneratingImage
        );
        if (result?.imageUrl) {
          toast.success("AI seal image generated!");
          return result.imageUrl;
        }
        return null;
      } catch {
        return null;
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [callAI]
  );

  const enhanceCertificate = useCallback(
    async (params: AIRequestParams): Promise<CertificateEnhancement | null> => {
      const result = await callAI<CertificateEnhancement>("enhance_certificate", params);
      if (result) {
        toast.success("Certificate enhanced!");
      }
      return result;
    },
    [callAI]
  );

  return {
    isLoading,
    isGeneratingImage,
    generateDescription,
    analyzeAuthenticity,
    generateSealDesign,
    generateSealImage,
    enhanceCertificate,
  };
}
