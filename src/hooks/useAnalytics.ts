import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MostVerifiedItem {
  id: string;
  productName: string;
  serialNumber: string;
  category: string | null;
  verificationCount: number;
  lastVerified: string | null;
}

export interface AnalyticsData {
  totalCertificates: number;
  activeCertificates: number;
  transferredCertificates: number;
  totalVerifications: number;
  recentVerifications: number;
  certificatesByCategory: { category: string; count: number }[];
  verificationsOverTime: { date: string; count: number }[];
  mostVerifiedItems: MostVerifiedItem[];
}

export function useIssuerAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["issuer-analytics", user?.id],
    queryFn: async (): Promise<AnalyticsData> => {
      // Get certificate counts
      const { data: certificates, error: certError } = await supabase
        .from("certificates")
        .select("id, status, product_category, product_name, serial_number, created_at")
        .eq("issuer_id", user!.id);

      if (certError) throw certError;

      const totalCertificates = certificates?.length || 0;
      const activeCertificates =
        certificates?.filter((c) => c.status === "active").length || 0;
      const transferredCertificates =
        certificates?.filter((c) => c.status === "transferred").length || 0;

      // Get verification counts
      const certificateIds = certificates?.map((c) => c.id) || [];
      
      let totalVerifications = 0;
      let recentVerifications = 0;

      if (certificateIds.length > 0) {
        const { count: totalCount } = await supabase
          .from("verification_logs")
          .select("*", { count: "exact", head: true })
          .in("certificate_id", certificateIds);

        totalVerifications = totalCount || 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentCount } = await supabase
          .from("verification_logs")
          .select("*", { count: "exact", head: true })
          .in("certificate_id", certificateIds)
          .gte("verified_at", sevenDaysAgo.toISOString());

        recentVerifications = recentCount || 0;
      }

      // Group by category
      const categoryMap = new Map<string, number>();
      certificates?.forEach((cert) => {
        const category = cert.product_category || "Uncategorized";
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const certificatesByCategory = Array.from(categoryMap.entries()).map(
        ([category, count]) => ({ category, count })
      );

      // Group verifications by date (last 30 days)
      const verificationsOverTime: { date: string; count: number }[] = [];
      
      if (certificateIds.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: verificationLogs } = await supabase
          .from("verification_logs")
          .select("verified_at")
          .in("certificate_id", certificateIds)
          .gte("verified_at", thirtyDaysAgo.toISOString());

        const dateMap = new Map<string, number>();
        verificationLogs?.forEach((log) => {
          const date = log.verified_at.split("T")[0];
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        });

        // Fill in missing dates
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          verificationsOverTime.unshift({
            date: dateStr,
            count: dateMap.get(dateStr) || 0,
          });
        }
      }

      // Get most verified items
      const mostVerifiedItems: MostVerifiedItem[] = [];
      
      if (certificateIds.length > 0) {
        const { data: verificationCounts } = await supabase
          .from("verification_logs")
          .select("certificate_id, verified_at")
          .in("certificate_id", certificateIds);

        // Count verifications per certificate
        const countMap = new Map<string, { count: number; lastVerified: string | null }>();
        verificationCounts?.forEach((log) => {
          const existing = countMap.get(log.certificate_id);
          if (existing) {
            existing.count += 1;
            if (!existing.lastVerified || log.verified_at > existing.lastVerified) {
              existing.lastVerified = log.verified_at;
            }
          } else {
            countMap.set(log.certificate_id, { count: 1, lastVerified: log.verified_at });
          }
        });

        // Sort by count and get top 5
        const sortedCerts = Array.from(countMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5);

        // Match with certificate data
        sortedCerts.forEach(([certId, data]) => {
          const cert = certificates?.find((c) => c.id === certId);
          if (cert) {
            mostVerifiedItems.push({
              id: cert.id,
              productName: cert.product_name || "Unknown Product",
              serialNumber: cert.serial_number || "N/A",
              category: cert.product_category,
              verificationCount: data.count,
              lastVerified: data.lastVerified,
            });
          }
        });
      }

      return {
        totalCertificates,
        activeCertificates,
        transferredCertificates,
        totalVerifications,
        recentVerifications,
        certificatesByCategory,
        verificationsOverTime,
        mostVerifiedItems,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
