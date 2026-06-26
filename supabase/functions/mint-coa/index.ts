import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CREDITS_PER_SEAL = 1;
const PUBLIC_APP_URL =
  Deno.env.get("PUBLIC_APP_URL") || "https://authenti-seek.lovable.app";

/** Base64-encode bytes in chunks (avoids stack overflow on large images). */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: resolve the calling user from their JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const { certificateId } = await req.json();
    if (!certificateId) {
      return json({ error: "certificateId is required" }, 400);
    }

    const SIGNER_URL = Deno.env.get("SIGNER_URL");
    const SIGNER_SHARED_SECRET = Deno.env.get("SIGNER_SHARED_SECRET");
    if (!SIGNER_URL || !SIGNER_SHARED_SECRET) {
      throw new Error("SIGNER_URL / SIGNER_SHARED_SECRET are not configured");
    }

    // --- Service-role client for privileged reads/writes (bypasses RLS) ---
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cert, error: certError } = await admin
      .from("certificates")
      .select("*")
      .eq("id", certificateId)
      .maybeSingle();
    if (certError) throw certError;
    if (!cert) return json({ error: "Certificate not found" }, 404);

    // Ownership: only the issuer may mint their certificate.
    if (cert.issuer_id !== userId) {
      return json({ error: "Forbidden" }, 403);
    }

    // Server-side mismatch gate — cannot be bypassed from the client.
    if (cert.grader_match_status === "mismatch") {
      return json(
        { error: "Cannot mint — grader mismatch. Resolve or report before sealing." },
        403
      );
    }

    // Idempotency.
    if (cert.mint_status === "minted") {
      return json({
        success: true,
        alreadyMinted: true,
        assetId: cert.asset_id,
        signature: cert.solana_signature,
        metadataUri: cert.metadata_uri,
      });
    }
    if (cert.mint_status === "minting") {
      return json({ error: "Mint already in progress" }, 409);
    }

    // Resolve the COA image (Supabase Storage URL today) and fetch its bytes.
    const metadata = (cert.metadata ?? {}) as { certificateImageUrl?: string };
    const imageUrl = metadata.certificateImageUrl || cert.product_images?.[0];
    if (!imageUrl) {
      await admin
        .from("certificates")
        .update({ mint_status: "failed", mint_error: "No certificate image" })
        .eq("id", certificateId);
      return json({ error: "Certificate has no image to mint" }, 400);
    }

    // Claim the mint (best-effort lock against concurrent invocations).
    await admin.from("certificates").update({ mint_status: "minting", mint_error: null }).eq("id", certificateId);

    const refundCredit = async () => {
      const { error } = await admin.rpc("refund_credits", {
        p_user_id: userId,
        p_amount: CREDITS_PER_SEAL,
        p_description: `Mint failed: ${cert.serial_number}`,
        p_reference_id: cert.serial_number,
      });
      if (error) console.error("refund_credits failed:", error.message);
    };

    try {
      const imageResp = await fetch(imageUrl);
      if (!imageResp.ok) throw new Error(`Failed to fetch certificate image (${imageResp.status})`);
      const imageBytes = new Uint8Array(await imageResp.arrayBuffer());
      const imageBase64 = toBase64(imageBytes);

      const nftMetadata = {
        name: `COA: ${cert.product_name}`,
        symbol: "ASEAL",
        description: cert.product_description || `Authenticity certificate for ${cert.product_name}.`,
        external_url: `${PUBLIC_APP_URL}/verify?serial=${encodeURIComponent(cert.serial_number)}`,
        attributes: [
          { trait_type: "Serial Number", value: cert.serial_number },
          { trait_type: "Product Name", value: cert.product_name },
          { trait_type: "Issue Date", value: cert.issued_at },
          ...(cert.product_category ? [{ trait_type: "Category", value: cert.product_category }] : []),
          { trait_type: "Certificate Type", value: "Authenticity" },
          { trait_type: "Verification", value: "AuthentiSeal Verified" },
        ],
      };

      const signerResp = await fetch(`${SIGNER_URL.replace(/\/$/, "")}/mint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signer-secret": SIGNER_SHARED_SECRET,
        },
        body: JSON.stringify({ userId, image: imageBase64, metadata: nftMetadata }),
      });

      if (!signerResp.ok) {
        const detail = await signerResp.text();
        throw new Error(`Signer error (${signerResp.status}): ${detail}`);
      }

      const { assetId, address, signature, metadataUri, imageUri } = await signerResp.json();

      await admin
        .from("certificates")
        .update({
          asset_id: assetId,
          metadata_uri: metadataUri,
          image_uri: imageUri,
          solana_signature: signature,
          current_owner_wallet: address,
          mint_status: "minted",
          minted_at: new Date().toISOString(),
          mint_error: null,
        })
        .eq("id", certificateId);

      return json({ success: true, assetId, signature, metadataUri, imageUri });
    } catch (mintError) {
      const message = mintError instanceof Error ? mintError.message : "Mint failed";
      console.error("mint-coa failed:", message);
      await admin
        .from("certificates")
        .update({ mint_status: "failed", mint_error: message.slice(0, 500) })
        .eq("id", certificateId);
      await refundCredit();
      return json({ error: message, refunded: true }, 502);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("mint-coa error:", message);
    return json({ error: message }, 500);
  }
});
