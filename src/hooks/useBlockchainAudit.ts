import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BlockchainOperation =
  | "mint_nft"
  | "mint_memo"
  | "verify_onchain"
  | "transfer_ownership"
  | "metadata_lookup"
  | "wallet_connect"
  | "wallet_disconnect"
  | "balance_check";

interface AuditLogParams {
  operation: BlockchainOperation;
  certificateId?: string;
  walletAddress?: string;
  solanaSignature?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hash sensitive data for privacy-preserving audit logs
 */
async function hashForAudit(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + "audit-salt-v1");
  const hashBuffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    data.buffer as ArrayBuffer
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Hook for logging blockchain-related operations to the audit trail
 */
export function useBlockchainAudit() {
  const { user } = useAuth();

  const logOperation = useCallback(
    async (params: AuditLogParams): Promise<void> => {
      try {
        // Hash IP-like identifiers from user agent for privacy
        const userAgentHash = await hashForAudit(
          navigator.userAgent || "unknown"
        );

        // Build request metadata
        const requestMetadata: Record<string, unknown> = {
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          ...params.metadata,
        };

        // Insert audit log - use any to bypass type sync delay
        const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }> } })
          .from("blockchain_audit_logs")
          .insert({
            user_id: user?.id ?? null,
            operation_type: params.operation,
            certificate_id: params.certificateId ?? null,
            wallet_address: params.walletAddress ?? null,
            solana_signature: params.solanaSignature ?? null,
            user_agent_hash: userAgentHash,
            request_metadata: requestMetadata,
            success: params.success,
            error_message: params.errorMessage ?? null,
          });

        if (error) {
          // Silent fail - don't break the main operation due to audit logging
          console.warn("Audit log failed:", error.message);
        }
      } catch (err) {
        // Silent fail for audit logging
        console.warn("Audit log error:", err);
      }
    },
    [user]
  );

  /**
   * Log a successful minting operation
   */
  const logMint = useCallback(
    async (
      mode: "nft" | "memo",
      certificateId: string,
      walletAddress: string,
      signature: string
    ) => {
      await logOperation({
        operation: mode === "nft" ? "mint_nft" : "mint_memo",
        certificateId,
        walletAddress,
        solanaSignature: signature,
        success: true,
      });
    },
    [logOperation]
  );

  /**
   * Log a failed minting attempt
   */
  const logMintError = useCallback(
    async (
      mode: "nft" | "memo",
      certificateId: string,
      walletAddress: string,
      errorMessage: string
    ) => {
      await logOperation({
        operation: mode === "nft" ? "mint_nft" : "mint_memo",
        certificateId,
        walletAddress,
        success: false,
        errorMessage,
      });
    },
    [logOperation]
  );

  /**
   * Log an on-chain verification attempt
   */
  const logVerification = useCallback(
    async (
      certificateId: string,
      signature: string,
      verified: boolean,
      metadata?: Record<string, unknown>
    ) => {
      await logOperation({
        operation: "verify_onchain",
        certificateId,
        solanaSignature: signature,
        success: verified,
        metadata,
      });
    },
    [logOperation]
  );

  /**
   * Log ownership transfer
   */
  const logTransfer = useCallback(
    async (
      certificateId: string,
      fromWallet: string,
      toWallet: string,
      signature?: string,
      success: boolean = true,
      errorMessage?: string
    ) => {
      await logOperation({
        operation: "transfer_ownership",
        certificateId,
        walletAddress: toWallet,
        solanaSignature: signature,
        success,
        errorMessage,
        metadata: { fromWallet, toWallet },
      });
    },
    [logOperation]
  );

  /**
   * Log wallet connection events
   */
  const logWalletEvent = useCallback(
    async (
      event: "connect" | "disconnect",
      walletAddress: string,
      walletName?: string
    ) => {
      await logOperation({
        operation: event === "connect" ? "wallet_connect" : "wallet_disconnect",
        walletAddress,
        success: true,
        metadata: { walletName },
      });
    },
    [logOperation]
  );

  return {
    logOperation,
    logMint,
    logMintError,
    logVerification,
    logTransfer,
    logWalletEvent,
  };
}
