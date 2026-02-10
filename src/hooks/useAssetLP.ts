import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSolPrice } from "@/hooks/useSolPrice";

export interface LPSummary {
  id: string;
  certificate_id: string;
  total_sol: number;
  total_usdc: number;
  total_usdt: number;
  floor_value_usd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LPDeposit {
  id: string;
  certificate_id: string;
  depositor_id: string;
  deposit_type: "sol" | "usdc" | "usdt";
  amount_token: number;
  amount_usd_at_deposit: number;
  solana_signature: string;
  status: "pending" | "confirmed" | "failed";
  created_at: string;
}

export function useAssetLP(certificateId: string | null) {
  const queryClient = useQueryClient();
  const { solPrice, solToUsd } = useSolPrice();

  const summaryQuery = useQuery({
    queryKey: ["asset-lp-summary", certificateId],
    queryFn: async (): Promise<LPSummary | null> => {
      if (!certificateId) return null;
      const { data, error } = await supabase
        .from("asset_lp_summary")
        .select("*")
        .eq("certificate_id", certificateId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        total_sol: Number(data.total_sol),
        total_usdc: Number(data.total_usdc),
        total_usdt: Number(data.total_usdt),
        floor_value_usd: Number(data.floor_value_usd),
      } as LPSummary;
    },
    enabled: !!certificateId,
  });

  const depositsQuery = useQuery({
    queryKey: ["asset-lp-deposits", certificateId],
    queryFn: async (): Promise<LPDeposit[]> => {
      if (!certificateId) return [];
      const { data, error } = await supabase
        .from("asset_lp_deposits")
        .select("*")
        .eq("certificate_id", certificateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        amount_token: Number(d.amount_token),
        amount_usd_at_deposit: Number(d.amount_usd_at_deposit),
      }));
    },
    enabled: !!certificateId,
  });

  const verifyDepositMutation = useMutation({
    mutationFn: async (params: {
      certificate_id: string;
      solana_signature: string;
      deposit_type: "sol" | "usdc" | "usdt";
      amount_token: number;
      amount_usd: number;
      floor_value_usd?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-lp-deposit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to verify deposit");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-lp-summary", certificateId] });
      queryClient.invalidateQueries({ queryKey: ["asset-lp-deposits", certificateId] });
    },
  });

  // Calculate live backed value
  const summary = summaryQuery.data;
  const solValueUsd = summary && solPrice ? summary.total_sol * solPrice : 0;
  const stablecoinValueUsd = summary ? summary.total_usdc + summary.total_usdt : 0;
  const totalBackedValueUsd = solValueUsd + stablecoinValueUsd;
  const floorProgress = summary && summary.floor_value_usd > 0
    ? Math.min((totalBackedValueUsd / summary.floor_value_usd) * 100, 100)
    : 0;

  return {
    summary,
    deposits: depositsQuery.data || [],
    isLoading: summaryQuery.isLoading,
    isDepositsLoading: depositsQuery.isLoading,
    verifyDeposit: verifyDepositMutation.mutateAsync,
    isVerifying: verifyDepositMutation.isPending,
    solValueUsd,
    stablecoinValueUsd,
    totalBackedValueUsd,
    floorProgress,
    refetch: () => {
      summaryQuery.refetch();
      depositsQuery.refetch();
    },
  };
}
