import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support two auth methods: JWT (user auth) or cross-app shared key (partner auth)
    const appKey = req.headers.get("x-app-key");
    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;

    // Method 1: Cross-app shared key (partner requests from CollectAI)
    if (appKey) {
      const sharedKey = Deno.env.get("CROSS_APP_SHARED_KEY");
      if (sharedKey && appKey === sharedKey) {
        isAuthenticated = true;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid cross-app key" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Method 2: JWT authentication (user requests from AuthentiSeal frontend)
    if (!isAuthenticated) {
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

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const COLLECTAI_API_KEY = Deno.env.get("COLLECTAI_API_KEY");
    if (!COLLECTAI_API_KEY) {
      throw new Error("COLLECTAI_API_KEY is not configured");
    }

    const { imageUrl, action } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call CollectAI identification API
    const collectaiResponse = await fetch(
      "https://irncxwszrawrndsdaqel.supabase.co/functions/v1/collectai-identify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": COLLECTAI_API_KEY,
        },
        body: JSON.stringify({
          imageUrl,
          action: action || "identify",
        }),
      }
    );

    if (!collectaiResponse.ok) {
      const errorText = await collectaiResponse.text();
      console.error("CollectAI API error:", collectaiResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "CollectAI identification failed",
          status: collectaiResponse.status,
        }),
        { status: collectaiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await collectaiResponse.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CollectAI identify error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
