import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GraderId = "psa" | "tag" | "beckett" | "sgc" | "cgc";

export type GraderMatchStatus =
  | "grader_verified"
  | "grader_linked"
  | "self_attested"
  | "mismatch";

export interface GraderCard {
  subject: string | null;
  brand: string | null;
  year: string | null;
  cardNumber: string | null;
  variety: string | null;
  category: string | null;
}

export interface GraderImages {
  front: string | null;
  back: string | null;
}

export interface GraderCrossCheck {
  mode: "A-vs-B" | "B-vs-C-fields" | "B-vs-C-freetext" | "none";
  matched_fields: string[];
  mismatched_fields: string[];
  comparable_fields: string[];
  sources: { collectAi: boolean; grader: boolean; sealed: boolean };
}

export interface GraderVerifyResult {
  status: GraderMatchStatus;
  grade: string | null;
  gradeScale: string | null;
  reportUrl: string;
  card: GraderCard;
  images: GraderImages;
  crossCheck: GraderCrossCheck;
  snapshot: unknown;
  certNumber: string;
  grader: GraderId;
  mode: "preview" | "commit";
}

interface VerifyArgs {
  grader: GraderId;
  certNumber: string;
  certificateId?: string;
  sealedCard?: {
    product_name?: string | null;
    subject?: string | null;
    brand?: string | null;
    year?: string | null;
    cardNumber?: string | null;
  } | null;
  collectAiCard?: {
    subject?: string | null;
    brand?: string | null;
    year?: string | null;
    cardNumber?: string | null;
  } | null;
}

export function useGraderVerification() {
  const [result, setResult] = useState<GraderVerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (args: VerifyArgs): Promise<GraderVerifyResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "verify-grader-cert",
        { body: args },
      );
      if (invokeErr) throw new Error(invokeErr.message);
      if (!data || (data as { error?: string }).error) {
        throw new Error((data as { error?: string })?.error ?? "Verification failed");
      }
      const r = data as GraderVerifyResult;
      if (!args.certificateId) setResult(r);
      return r;
    } catch (e) {
      const msg = (e as Error).message ?? "Verification failed";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { verify, reset, result, isLoading, error };
}
