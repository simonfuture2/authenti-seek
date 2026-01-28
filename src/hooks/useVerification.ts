import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TablesInsert, Json } from "@/integrations/supabase/types";
import { logError } from "@/lib/errorHandler";

type VerificationLogInsert = TablesInsert<"verification_logs">;
type FakeReportInsert = TablesInsert<"fake_reports">;

export function useVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const logVerification = useMutation({
    mutationFn: async ({
      certificateId,
      method = "qr_scan",
      locationData,
    }: {
      certificateId: string;
      method?: string;
      locationData?: Record<string, unknown>;
    }) => {
      const insertData: VerificationLogInsert = {
        certificate_id: certificateId,
        verifier_id: user!.id,
        verification_method: method,
        location_data: (locationData || null) as Json | null,
      };

      const { data, error } = await supabase
        .from("verification_logs")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Verification Logged",
        description: "This verification has been recorded.",
      });
    },
    onError: (error: Error) => {
      logError(error, "useVerification.logVerification");
    },
  });

  const reportFake = useMutation({
    mutationFn: async ({
      certificateId,
      serialNumber,
      reason,
      evidenceUrls,
    }: {
      certificateId?: string;
      serialNumber?: string;
      reason: string;
      evidenceUrls?: string[];
    }) => {
      const insertData: FakeReportInsert = {
        certificate_id: certificateId || null,
        serial_number: serialNumber || null,
        reporter_id: user!.id,
        reason,
        evidence_urls: evidenceUrls || [],
      };

      const { data, error } = await supabase
        .from("fake_reports")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fake-reports"] });
      toast({
        title: "Report Submitted",
        description: "Thank you for reporting. We'll review this shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Report Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    logVerification,
    reportFake,
  };
}
