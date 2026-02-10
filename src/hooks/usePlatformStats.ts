import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlatformStats {
  totalCertificates: number;
  totalVerifications: number;
  onChainRate: number;
  activeIssuers: number;
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async (): Promise<PlatformStats> => {
      const [certRes, verRes, onChainRes] = await Promise.all([
        supabase
          .from("certificates_public")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("verification_logs")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("certificates_public")
          .select("id", { count: "exact", head: true })
          .not("solana_signature", "is", null),
      ]);

      const totalCertificates = certRes.count || 0;
      const totalVerifications = verRes.count || 0;
      const onChainCount = onChainRes.count || 0;
      const onChainRate = totalCertificates > 0
        ? Math.round((onChainCount / totalCertificates) * 100)
        : 0;

      // Count distinct issuers
      const { data: issuers } = await supabase
        .from("certificates_public")
        .select("issuer_id");

      const uniqueIssuers = new Set(issuers?.map((c) => c.issuer_id).filter(Boolean));

      return {
        totalCertificates,
        totalVerifications,
        onChainRate,
        activeIssuers: uniqueIssuers.size,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
