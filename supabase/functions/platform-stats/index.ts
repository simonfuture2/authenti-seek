import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [certRes, verRes, onChainRes] = await Promise.all([
      supabase
        .from("certificates")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("verification_logs")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("certificates")
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
      .from("certificates")
      .select("issuer_id");

    const uniqueIssuers = new Set(
      issuers?.map((c: { issuer_id: string | null }) => c.issuer_id).filter(Boolean)
    );

    return new Response(
      JSON.stringify({
        totalCertificates,
        totalVerifications,
        onChainRate,
        activeIssuers: uniqueIssuers.size,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (error) {
    console.error("Platform stats error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
