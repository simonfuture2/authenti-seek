import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, Json } from "@/integrations/supabase/types";

export type Certificate = Tables<"certificates">;
export type CertificateInsert = TablesInsert<"certificates">;

export interface CreateCertificateInput {
  serial_number: string;
  product_name: string;
  product_description?: string;
  product_category?: string;
  product_images?: string[];
  metadata?: Record<string, unknown>;
  current_owner_wallet?: string;
}

const CREDITS_PER_CERTIFICATE = 1;

export function useCertificates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const certificatesQuery = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("issuer_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createCertificate = useMutation({
    mutationFn: async (input: CreateCertificateInput) => {
      // First, check if user has enough credits
      const { data: credits, error: creditsError } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (creditsError) throw new Error("Failed to check credit balance");
      
      const currentBalance = credits?.balance ?? 0;
      if (currentBalance < CREDITS_PER_CERTIFICATE) {
        throw new Error(`Insufficient credits. You need ${CREDITS_PER_CERTIFICATE} credit to create a certificate. Current balance: ${currentBalance}`);
      }

      // Deduct credits using the database function
      const { data: deductResult, error: deductError } = await supabase
        .rpc("deduct_credits", {
          p_user_id: user!.id,
          p_amount: CREDITS_PER_CERTIFICATE,
          p_transaction_type: "certificate_creation",
          p_description: `Certificate created: ${input.serial_number}`,
          p_reference_id: input.serial_number,
        });

      if (deductError) throw new Error("Failed to deduct credits");
      
      const result = deductResult?.[0];
      if (!result?.success) {
        throw new Error(result?.message || "Failed to deduct credits");
      }

      // Now create the certificate
      const qrData = JSON.stringify({
        type: "COA",
        serial: input.serial_number,
        issuer: user!.id,
        timestamp: Date.now(),
      });

      const insertData: CertificateInsert = {
        serial_number: input.serial_number,
        product_name: input.product_name,
        product_description: input.product_description || null,
        product_category: input.product_category || null,
        product_images: input.product_images || [],
        metadata: (input.metadata || {}) as Json,
        current_owner_wallet: input.current_owner_wallet || null,
        issuer_id: user!.id,
        qr_code_data: qrData,
      };

      const { data, error } = await supabase
        .from("certificates")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-credits", user?.id] });
      toast({
        title: "Certificate Created",
        description: "Your certificate has been created successfully. 1 credit deducted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transferCertificate = useMutation({
    mutationFn: async ({
      certificateId,
      toWallet,
      fromWallet,
    }: {
      certificateId: string;
      toWallet: string;
      fromWallet: string;
    }) => {
      // Create transfer record
      const { error: transferError } = await supabase
        .from("certificate_transfers")
        .insert({
          certificate_id: certificateId,
          from_wallet: fromWallet,
          to_wallet: toWallet,
        });

      if (transferError) throw transferError;

      // Update certificate owner
      const { data, error } = await supabase
        .from("certificates")
        .update({
          current_owner_wallet: toWallet,
          status: "transferred" as const,
        })
        .eq("id", certificateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", user?.id] });
      toast({
        title: "Certificate Transferred",
        description: "Ownership has been transferred successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    certificates: certificatesQuery.data || [],
    isLoading: certificatesQuery.isLoading,
    error: certificatesQuery.error,
    createCertificate,
    transferCertificate,
    refetch: certificatesQuery.refetch,
  };
}

// Maximum search query length to prevent abuse
const MAX_SEARCH_QUERY_LENGTH = 100;
const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Sanitizes search input to prevent LIKE pattern abuse
 * Replaces excessive wildcards with safe alternatives
 */
function sanitizeSearchQuery(query: string): string {
  // Trim whitespace
  let sanitized = query.trim();
  
  // Replace excessive consecutive wildcards (% or _) with limited versions
  sanitized = sanitized.replace(/[%_]{3,}/g, '__');
  
  // Escape any remaining % or _ that could be used for pattern abuse
  sanitized = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
  
  return sanitized;
}

export function useCertificateSearch() {
  const searchCertificate = async (query: string) => {
    // Validate input - return empty for invalid queries
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    const trimmedQuery = query.trim();
    
    // Check minimum length
    if (trimmedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      return [];
    }
    
    // Check maximum length to prevent abuse
    if (trimmedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
      throw new Error(`Search query too long. Maximum ${MAX_SEARCH_QUERY_LENGTH} characters allowed.`);
    }
    
    // Sanitize the query to prevent LIKE pattern abuse
    const sanitizedQuery = sanitizeSearchQuery(trimmedQuery);
    
    // First get the certificates
    const { data: certificates, error } = await supabase
      .from("certificates")
      .select("*")
      .or(`serial_number.ilike.%${sanitizedQuery}%,product_name.ilike.%${sanitizedQuery}%`)
      .eq("status", "active")
      .limit(20);

    if (error) throw error;
    if (!certificates || certificates.length === 0) return [];

    // Then get the issuer profiles separately
    const issuerIds = [...new Set(certificates.map(c => c.issuer_id).filter(Boolean))];
    
    if (issuerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, company_name")
        .in("user_id", issuerIds);

      // Merge profile data into certificates
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return certificates.map(cert => ({
        ...cert,
        profiles: cert.issuer_id ? profileMap.get(cert.issuer_id) : null,
      }));
    }

    return certificates;
  };

  const getCertificateBySerial = async (serialNumber: string) => {
    const { data: certificate, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("serial_number", serialNumber)
      .maybeSingle();

    if (error) throw error;
    if (!certificate) return null;

    // Get issuer profile if exists
    if (certificate.issuer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, company_name")
        .eq("user_id", certificate.issuer_id)
        .maybeSingle();

      return { ...certificate, profiles: profile };
    }

    return certificate;
  };

  const getCertificateById = async (id: string) => {
    const { data: certificate, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!certificate) return null;

    // Get issuer profile if exists
    if (certificate.issuer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, company_name")
        .eq("user_id", certificate.issuer_id)
        .maybeSingle();

      return { ...certificate, profiles: profile };
    }

    return certificate;
  };

  return {
    searchCertificate,
    getCertificateBySerial,
    getCertificateById,
  };
}

export function useCertificateHistory(certificateId: string) {
  return useQuery({
    queryKey: ["certificate-history", certificateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_transfers")
        .select("*")
        .eq("certificate_id", certificateId)
        .order("transferred_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!certificateId,
  });
}
