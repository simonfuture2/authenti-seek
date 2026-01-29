import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  created_at: string;
  updated_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  package_type: "starter" | "pro" | "enterprise";
  credits: number;
  price_usd: number;
  price_sol: number | null;
  description: string | null;
  is_popular: boolean;
  is_active: boolean;
}

export function useCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's current credit balance
  const creditsQuery = useQuery({
    queryKey: ["user-credits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserCredits | null;
    },
    enabled: !!user,
  });

  // Fetch available credit packages
  const packagesQuery = useQuery({
    queryKey: ["credit-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("credits", { ascending: true });

      if (error) throw error;
      return data as CreditPackage[];
    },
  });

  // Purchase credits with SOL
  const purchaseWithSol = useMutation({
    mutationFn: async ({
      packageId,
      transactionSignature,
      walletAddress,
    }: {
      packageId: string;
      transactionSignature: string;
      walletAddress: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            package_id: packageId,
            payment_method: "sol",
            transaction_signature: transactionSignature,
            wallet_address: walletAddress,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Purchase failed");
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-credits", user?.id] });
      toast({
        title: "Credits Purchased!",
        description: `Added ${data.credits_added} credits to your account.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    credits: creditsQuery.data,
    isLoadingCredits: creditsQuery.isLoading,
    packages: packagesQuery.data,
    isLoadingPackages: packagesQuery.isLoading,
    purchaseWithSol,
    refetchCredits: creditsQuery.refetch,
  };
}
