const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TRUSTED_DOMAINS = [
  "mycollectai.com",
  "ffudcsfmihkrjodfilnt.supabase.co",
  "id-preview--c2bfb26c-8b9a-4ca0-a5fc-e041ed4c9702.lovable.app",
];

function isUrlTrusted(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function base64UrlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { callback_url, card_id, serial_number } = await req.json();

    if (!callback_url || !card_id || !serial_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: callback_url, card_id, serial_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isUrlTrusted(callback_url)) {
      console.error("Untrusted callback URL:", callback_url);
      return new Response(
        JSON.stringify({ error: "Untrusted callback URL" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = Deno.env.get("AUTHENTISEAL_SHARED_SECRET");
    if (!secret) {
      console.error("AUTHENTISEAL_SHARED_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        source: "authentiseal",
        card_id,
        serial_number,
        iat: now,
        exp: now + 300, // 5 minutes
      },
      secret
    );

    // POST to callback URL
    const callbackResponse = await fetch(callback_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, card_id, serial_number }),
    });

    if (!callbackResponse.ok) {
      const errText = await callbackResponse.text();
      console.error("Callback POST failed:", callbackResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Callback failed", status: callbackResponse.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await callbackResponse.text(); // consume body

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collectai-callback error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
