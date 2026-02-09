import { useQuery } from "@tanstack/react-query";

interface SolPriceResponse {
  success: boolean;
  price_usd: number;
  currency: string;
  token: string;
  source: string;
  cached: boolean;
  fetched_at: string;
}

export function useSolPrice() {
  const query = useQuery({
    queryKey: ["sol-price"],
    queryFn: async (): Promise<number> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sol-price`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch SOL price");
      }

      const data: SolPriceResponse = await response.json();

      if (!data.success || !data.price_usd) {
        throw new Error("Invalid price data");
      }

      return data.price_usd;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });

  /**
   * Convert SOL amount to USD string
   */
  const solToUsd = (solAmount: number): string | null => {
    if (!query.data) return null;
    const usd = solAmount * query.data;
    return usd < 0.01 ? `<$0.01` : `~$${usd.toFixed(2)}`;
  };

  return {
    solPrice: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    solToUsd,
  };
}
