export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_lp_deposits: {
        Row: {
          amount_token: number
          amount_usd_at_deposit: number
          certificate_id: string
          created_at: string
          deposit_type: Database["public"]["Enums"]["lp_deposit_type"]
          depositor_id: string
          id: string
          solana_signature: string
          status: Database["public"]["Enums"]["lp_deposit_status"]
        }
        Insert: {
          amount_token: number
          amount_usd_at_deposit: number
          certificate_id: string
          created_at?: string
          deposit_type: Database["public"]["Enums"]["lp_deposit_type"]
          depositor_id: string
          id?: string
          solana_signature: string
          status?: Database["public"]["Enums"]["lp_deposit_status"]
        }
        Update: {
          amount_token?: number
          amount_usd_at_deposit?: number
          certificate_id?: string
          created_at?: string
          deposit_type?: Database["public"]["Enums"]["lp_deposit_type"]
          depositor_id?: string
          id?: string
          solana_signature?: string
          status?: Database["public"]["Enums"]["lp_deposit_status"]
        }
        Relationships: [
          {
            foreignKeyName: "asset_lp_deposits_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lp_deposits_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_lp_summary: {
        Row: {
          certificate_id: string
          created_at: string
          floor_value_usd: number
          id: string
          is_active: boolean
          total_sol: number
          total_usdc: number
          total_usdt: number
          updated_at: string
        }
        Insert: {
          certificate_id: string
          created_at?: string
          floor_value_usd?: number
          id?: string
          is_active?: boolean
          total_sol?: number
          total_usdc?: number
          total_usdt?: number
          updated_at?: string
        }
        Update: {
          certificate_id?: string
          created_at?: string
          floor_value_usd?: number
          id?: string
          is_active?: boolean
          total_sol?: number
          total_usdc?: number
          total_usdt?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_lp_summary_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: true
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lp_summary_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: true
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_audit_logs: {
        Row: {
          certificate_id: string | null
          created_at: string
          error_message: string | null
          id: string
          ip_hash: string | null
          operation_type: string
          request_metadata: Json | null
          solana_signature: string | null
          success: boolean
          user_agent_hash: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_hash?: string | null
          operation_type: string
          request_metadata?: Json | null
          solana_signature?: string | null
          success?: boolean
          user_agent_hash?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          certificate_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_hash?: string | null
          operation_type?: string
          request_metadata?: Json | null
          solana_signature?: string | null
          success?: boolean
          user_agent_hash?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_audit_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockchain_audit_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_metadata_versions: {
        Row: {
          certificate_id: string
          change_description: string | null
          change_type: Database["public"]["Enums"]["metadata_change_type"]
          changed_at: string
          changed_by: string | null
          id: string
          metadata_snapshot: Json
          previous_version_id: string | null
          version_number: number
        }
        Insert: {
          certificate_id: string
          change_description?: string | null
          change_type: Database["public"]["Enums"]["metadata_change_type"]
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata_snapshot: Json
          previous_version_id?: string | null
          version_number?: number
        }
        Update: {
          certificate_id?: string
          change_description?: string | null
          change_type?: Database["public"]["Enums"]["metadata_change_type"]
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata_snapshot?: Json
          previous_version_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificate_metadata_versions_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_metadata_versions_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_metadata_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "certificate_metadata_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_transfers: {
        Row: {
          certificate_id: string
          from_wallet: string
          id: string
          solana_signature: string | null
          to_wallet: string
          transferred_at: string
        }
        Insert: {
          certificate_id: string
          from_wallet: string
          id?: string
          solana_signature?: string | null
          to_wallet: string
          transferred_at?: string
        }
        Update: {
          certificate_id?: string
          from_wallet?: string
          id?: string
          solana_signature?: string | null
          to_wallet?: string
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_transfers_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_transfers_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          chain_pending_at: string | null
          chain_pending_by: string | null
          created_at: string
          current_owner_wallet: string | null
          id: string
          issued_at: string
          issuer_id: string | null
          metadata: Json | null
          metadata_hash: string | null
          physical_attributes: Json
          product_category: string | null
          product_description: string | null
          product_images: string[] | null
          product_name: string
          qr_code_data: string | null
          serial_number: string
          solana_account: string | null
          solana_signature: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          unique_identifiers: Json
          updated_at: string
        }
        Insert: {
          chain_pending_at?: string | null
          chain_pending_by?: string | null
          created_at?: string
          current_owner_wallet?: string | null
          id?: string
          issued_at?: string
          issuer_id?: string | null
          metadata?: Json | null
          metadata_hash?: string | null
          physical_attributes?: Json
          product_category?: string | null
          product_description?: string | null
          product_images?: string[] | null
          product_name: string
          qr_code_data?: string | null
          serial_number: string
          solana_account?: string | null
          solana_signature?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          unique_identifiers?: Json
          updated_at?: string
        }
        Update: {
          chain_pending_at?: string | null
          chain_pending_by?: string | null
          created_at?: string
          current_owner_wallet?: string | null
          id?: string
          issued_at?: string
          issuer_id?: string | null
          metadata?: Json | null
          metadata_hash?: string | null
          physical_attributes?: Json
          product_category?: string | null
          product_description?: string | null
          product_images?: string[] | null
          product_name?: string
          qr_code_data?: string | null
          serial_number?: string
          solana_account?: string | null
          solana_signature?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          unique_identifiers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          package_type: Database["public"]["Enums"]["credit_package"]
          price_sol: number | null
          price_usd: number
        }
        Insert: {
          created_at?: string
          credits: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          package_type: Database["public"]["Enums"]["credit_package"]
          price_sol?: number | null
          price_usd: number
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          package_type?: Database["public"]["Enums"]["credit_package"]
          price_sol?: number | null
          price_usd?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          reference_id: string | null
          solana_signature: string | null
          stripe_payment_id: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_id?: string | null
          solana_signature?: string | null
          stripe_payment_id?: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_id?: string | null
          solana_signature?: string | null
          stripe_payment_id?: string | null
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      fake_reports: {
        Row: {
          admin_notes: string | null
          certificate_id: string | null
          created_at: string
          evidence_urls: string[] | null
          id: string
          reason: string
          reporter_id: string
          serial_number: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          certificate_id?: string | null
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          reason: string
          reporter_id: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          certificate_id?: string | null
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          reason?: string
          reporter_id?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fake_reports_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fake_reports_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_verification_nonces: {
        Row: {
          certificate_id: string
          created_at: string
          id: string
          nonce: string
          scanned_at: string
          used_at: string | null
        }
        Insert: {
          certificate_id: string
          created_at?: string
          id?: string
          nonce: string
          scanned_at?: string
          used_at?: string | null
        }
        Update: {
          certificate_id?: string
          created_at?: string
          id?: string
          nonce?: string
          scanned_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_verification_nonces_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_verification_nonces_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_purchased: number
          lifetime_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_purchased?: number
          lifetime_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_purchased?: number
          lifetime_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_logs: {
        Row: {
          certificate_id: string
          id: string
          location_data: Json | null
          verification_method: string | null
          verified_at: string
          verifier_id: string | null
        }
        Insert: {
          certificate_id: string
          id?: string
          location_data?: Json | null
          verification_method?: string | null
          verified_at?: string
          verifier_id?: string | null
        }
        Update: {
          certificate_id?: string
          id?: string
          location_data?: Json | null
          verification_method?: string | null
          verified_at?: string
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_results: {
        Row: {
          ai_analysis: string | null
          attribute_checklist: Json | null
          attribute_confidence: number | null
          certificate_id: string
          created_at: string
          id: string
          identifier_confidence: number | null
          identifier_matches: Json | null
          image_confidence: number | null
          notes: string | null
          overall_confidence: number
          result_status: string
          verification_log_id: string | null
          verification_photos: string[] | null
          verifier_id: string
        }
        Insert: {
          ai_analysis?: string | null
          attribute_checklist?: Json | null
          attribute_confidence?: number | null
          certificate_id: string
          created_at?: string
          id?: string
          identifier_confidence?: number | null
          identifier_matches?: Json | null
          image_confidence?: number | null
          notes?: string | null
          overall_confidence: number
          result_status?: string
          verification_log_id?: string | null
          verification_photos?: string[] | null
          verifier_id: string
        }
        Update: {
          ai_analysis?: string | null
          attribute_checklist?: Json | null
          attribute_confidence?: number | null
          certificate_id?: string
          created_at?: string
          id?: string
          identifier_confidence?: number | null
          identifier_matches?: Json | null
          image_confidence?: number | null
          notes?: string | null
          overall_confidence?: number
          result_status?: string
          verification_log_id?: string | null
          verification_photos?: string[] | null
          verifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_results_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_results_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_results_verification_log_id_fkey"
            columns: ["verification_log_id"]
            isOneToOne: false
            referencedRelation: "verification_logs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      certificates_public: {
        Row: {
          created_at: string | null
          id: string | null
          issued_at: string | null
          issuer_id: string | null
          metadata: Json | null
          physical_attributes: Json | null
          product_category: string | null
          product_description: string | null
          product_images: string[] | null
          product_name: string | null
          qr_code_data: string | null
          serial_number: string | null
          solana_account: string | null
          solana_signature: string | null
          status: Database["public"]["Enums"]["certificate_status"] | null
          unique_identifiers: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          issued_at?: string | null
          issuer_id?: string | null
          metadata?: Json | null
          physical_attributes?: Json | null
          product_category?: string | null
          product_description?: string | null
          product_images?: string[] | null
          product_name?: string | null
          qr_code_data?: string | null
          serial_number?: string | null
          solana_account?: string | null
          solana_signature?: string | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          unique_identifiers?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          issued_at?: string | null
          issuer_id?: string | null
          metadata?: Json | null
          physical_attributes?: Json | null
          product_category?: string | null
          product_description?: string | null
          product_images?: string[] | null
          product_name?: string | null
          qr_code_data?: string | null
          serial_number?: string | null
          solana_account?: string | null
          solana_signature?: string | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          unique_identifiers?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_payment_id?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_user_id: string
        }
        Returns: {
          message: string
          new_balance: number
          success: boolean
        }[]
      }
      deduct_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: {
          message: string
          new_balance: number
          success: boolean
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "issuer" | "verifier" | "collector"
      certificate_status: "active" | "transferred" | "revoked"
      credit_package: "starter" | "pro" | "enterprise"
      credit_transaction_type:
        | "purchase"
        | "certificate_creation"
        | "verification"
        | "refund"
        | "bonus"
      lp_deposit_status: "pending" | "confirmed" | "failed"
      lp_deposit_type: "sol" | "usdc" | "usdt"
      metadata_change_type:
        | "created"
        | "updated"
        | "transferred"
        | "minted"
        | "revoked"
      payment_method: "stripe" | "sol"
      report_status: "pending" | "reviewed" | "resolved" | "dismissed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["issuer", "verifier", "collector"],
      certificate_status: ["active", "transferred", "revoked"],
      credit_package: ["starter", "pro", "enterprise"],
      credit_transaction_type: [
        "purchase",
        "certificate_creation",
        "verification",
        "refund",
        "bonus",
      ],
      lp_deposit_status: ["pending", "confirmed", "failed"],
      lp_deposit_type: ["sol", "usdc", "usdt"],
      metadata_change_type: [
        "created",
        "updated",
        "transferred",
        "minted",
        "revoked",
      ],
      payment_method: ["stripe", "sol"],
      report_status: ["pending", "reviewed", "resolved", "dismissed"],
    },
  },
} as const
