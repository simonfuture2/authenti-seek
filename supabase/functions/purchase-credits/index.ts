import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "https://esm.sh/@solana/web3.js@1.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Treasury wallet address for receiving SOL payments
const TREASURY_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAYWB";

// Solana RPC endpoint (using devnet for now)
const SOLANA_RPC = "https://api.devnet.solana.com";

interface PurchaseRequest {
  package_id: string;
  payment_method: "sol";
  transaction_signature: string;
  wallet_address: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Parse request body
    const body: PurchaseRequest = await req.json();
    const { package_id, payment_method, transaction_signature, wallet_address } = body;

    if (!package_id || !payment_method || !transaction_signature || !wallet_address) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment_method !== "sol") {
      return new Response(
        JSON.stringify({ error: "Only SOL payments are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the credit package
    const { data: creditPackage, error: packageError } = await supabase
      .from("credit_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();

    if (packageError || !creditPackage) {
      return new Response(
        JSON.stringify({ error: "Invalid package" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this transaction has already been used
    const { data: existingTx } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("solana_signature", transaction_signature)
      .maybeSingle();

    if (existingTx) {
      return new Response(
        JSON.stringify({ error: "Transaction already processed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the Solana transaction
    const connection = new Connection(SOLANA_RPC, "confirmed");
    
    let transactionInfo;
    try {
      transactionInfo = await connection.getTransaction(transaction_signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
    } catch (txError) {
      console.error("Error fetching transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to verify transaction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transactionInfo) {
      return new Response(
        JSON.stringify({ error: "Transaction not found. Please wait for confirmation." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check transaction was successful
    if (transactionInfo.meta?.err) {
      return new Response(
        JSON.stringify({ error: "Transaction failed on-chain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the transfer amount and recipient
    const expectedLamports = Math.floor((creditPackage.price_sol || 0) * LAMPORTS_PER_SOL);
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    
    // Check pre/post balances to verify payment
    const accountKeys = transactionInfo.transaction.message.getAccountKeys();
    const treasuryIndex = accountKeys.staticAccountKeys.findIndex(
      (key) => key.equals(treasuryPubkey)
    );

    if (treasuryIndex === -1) {
      return new Response(
        JSON.stringify({ error: "Payment not sent to treasury wallet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const preBalance = transactionInfo.meta?.preBalances?.[treasuryIndex] || 0;
    const postBalance = transactionInfo.meta?.postBalances?.[treasuryIndex] || 0;
    const receivedLamports = postBalance - preBalance;

    // Allow 1% tolerance for rounding
    const minExpected = Math.floor(expectedLamports * 0.99);
    if (receivedLamports < minExpected) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient payment. Expected ${creditPackage.price_sol} SOL, received ${receivedLamports / LAMPORTS_PER_SOL} SOL` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add credits using the database function
    // The unique constraint on solana_signature will prevent double-spend at DB level
    const { data: addResult, error: addError } = await supabase.rpc("add_credits", {
      p_user_id: userId,
      p_amount: creditPackage.credits,
      p_payment_method: "sol",
      p_payment_id: transaction_signature,
      p_description: `Purchased ${creditPackage.name} package (${creditPackage.credits} credits)`,
    });

    if (addError) {
      console.error("Error adding credits:", addError);
      
      // Check for unique constraint violation (Postgres error code 23505)
      // This catches race conditions where duplicate requests slip through
      if (addError.code === '23505' || addError.message?.includes('unique_solana_signature')) {
        return new Response(
          JSON.stringify({ error: "Transaction already processed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to add credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = addResult?.[0];

    return new Response(
      JSON.stringify({
        success: true,
        credits_added: creditPackage.credits,
        new_balance: result?.new_balance || creditPackage.credits,
        transaction_signature,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Purchase credits error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
