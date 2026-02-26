const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-key",
};

function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 += "=".repeat(4 - pad);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyHmacJwt(
  token: string,
  secret: string
): Promise<{ valid: boolean; payload?: Record<string, unknown>; error?: string }> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Invalid JWT format" };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Import the secret key for HMAC-SHA256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // Verify signature
  const signedInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);
  const isValid = await crypto.subtle.verify("HMAC", cryptoKey, signature, signedInput);

  if (!isValid) {
    return { valid: false, error: "Invalid signature" };
  }

  // Decode and parse payload
  const payloadBytes = base64UrlDecode(payloadB64);
  const payloadStr = new TextDecoder().decode(payloadBytes);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return { valid: false, error: "Invalid payload JSON" };
  }

  // Check expiry
  if (payload.exp && typeof payload.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return { valid: false, error: "Token expired" };
    }
  }

  return { valid: true, payload };
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
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const result = await verifyHmacJwt(token, secret);

    if (!result.valid) {
      return new Response(
        JSON.stringify({ error: result.error || "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = result.payload!;
    const cardData = {
      cardName: payload.cardName || null,
      cardDescription: payload.cardDescription || null,
      cardCategory: payload.cardCategory || null,
      cardImage: payload.cardImage || null,
      userEmail: payload.userEmail || null,
      grade: payload.grade || null,
      serialNumber: payload.serialNumber || null,
      callbackUrl: payload.callback_url || null,
      cardId: payload.card_id || null,
    };

    return new Response(JSON.stringify({ success: true, data: cardData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-collectai-jwt error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
