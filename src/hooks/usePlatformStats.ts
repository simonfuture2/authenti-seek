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
      const { data, error } = await supabase.functions.invoke("platform-stats", {
        method: "GET",
      });

      if (error) throw error;

      return {
        totalCertificates: data?.totalCertificates ?? 0,
        totalVerifications: data?.totalVerifications ?? 0,
        onChainRate: data?.onChainRate ?? 0,
        activeIssuers: data?.activeIssuers ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
