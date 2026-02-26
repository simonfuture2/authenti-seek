import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Validate cross-app shared key for ecosystem partner requests.
 * Returns true if the request has a valid shared key, false otherwise.
 * Public requests without the key are still allowed (open API).
 */
function validateCrossAppKey(req: Request): { isPartnerRequest: boolean; isValid: boolean } {
  const appKey = req.headers.get("x-app-key");
  if (!appKey) return { isPartnerRequest: false, isValid: false };
  const sharedKey = Deno.env.get("CROSS_APP_SHARED_KEY");
  return { isPartnerRequest: true, isValid: !!sharedKey && appKey === sharedKey };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate cross-app key if provided (partner requests get uncached responses)
    const { isPartnerRequest, isValid } = validateCrossAppKey(req);
    if (isPartnerRequest && !isValid) {
      return new Response(
        JSON.stringify({ verified: false, certificate: null, error: "Invalid cross-app key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow GET requests
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ verified: false, certificate: null, error: "Method not allowed. Use GET." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const serial = url.searchParams.get("serial");
    const id = url.searchParams.get("id");

    if (!serial && !id) {
      return new Response(
        JSON.stringify({
          verified: false,
          certificate: null,
          error: "Missing required parameter: 'serial' or 'id'",
          usage: {
            description: "AuthentiSeal Public Verification API",
            endpoints: {
              by_serial: "GET /verify-public?serial=SN-2024-001",
              by_id: "GET /verify-public?id=<certificate-uuid>",
            },
            response: {
              verified: "boolean - whether the certificate exists and is active",
              certificate: "object - certificate details if found",
            },
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input length to prevent abuse
    const query = serial || id || "";
    if (query.length > 200) {
      return new Response(
        JSON.stringify({ verified: false, certificate: null, error: "Query too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to read from public view
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Query the public certificates view (which masks sensitive data)
    const column = serial ? "serial_number" : "id";
    const value = serial || id;

    const { data: cert, error: dbError } = await supabase
      .from("certificates_public")
      .select("*")
      .eq(column, value)
      .maybeSingle();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ verified: false, certificate: null, error: "Verification service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!cert) {
      return new Response(
        JSON.stringify({ verified: false, certificate: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch issuer profile
    let issuerProfile = null;
    if (cert.issuer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, company_name")
        .eq("user_id", cert.issuer_id)
        .maybeSingle();

      issuerProfile = profile;
    }

    const BASE_URL = "https://authenti-seek.lovable.app";

    const response: PublicCertificateResponse = {
      verified: cert.status === "active",
      certificate: {
        id: cert.id,
        serial_number: cert.serial_number,
        product_name: cert.product_name,
        product_description: cert.product_description,
        product_category: cert.product_category,
        product_images: cert.product_images,
        status: cert.status,
        issued_at: cert.issued_at,
        on_chain: !!cert.solana_signature,
        solana_signature: cert.solana_signature || null,
        issuer: issuerProfile,
        verify_url: `${BASE_URL}/verify?serial=${encodeURIComponent(cert.serial_number)}`,
        issuer_profile_url: null,
      },
    };

    // Partner requests skip cache for real-time data
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": isPartnerRequest ? "no-cache" : "public, max-age=60",
        "X-RateLimit-Limit": isPartnerRequest ? "500" : "100",
        "X-Powered-By": "AuthentiSeal",
        "X-Partner-Verified": isPartnerRequest ? "true" : "false",
      },
    });
  } catch (error) {
    console.error("Verify-public error:", error);
    return new Response(
      JSON.stringify({ verified: false, certificate: null, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
