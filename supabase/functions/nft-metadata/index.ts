import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: Simple in-memory store (resets on function cold start)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties?: {
    version_history?: Array<{
      version: number;
      change_type: string;
      description: string;
      timestamp: string;
    }>;
  };
}

/**
 * Simple rate limiting check
 */
function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(clientIp);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Generate hash for serial number lookup (must match client-side implementation)
 */
async function hashSerialNumber(serialNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(serialNumber + "authenti-seal-salt-v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract lookup key from URL path (either hash or serial number)
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const lookupKey = pathParts[pathParts.length - 1];

    if (!lookupKey || lookupKey === "nft-metadata") {
      return new Response(
        JSON.stringify({ error: "Certificate identifier is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate lookup key format (should be alphanumeric, max 64 chars)
    if (!/^[a-zA-Z0-9-]+$/.test(lookupKey) || lookupKey.length > 64) {
      return new Response(
        JSON.stringify({ error: "Invalid identifier format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with ANON key for RLS-protected access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try to find certificate by serial number first
    let certificate = null;
    
    // Query the public view (respects RLS and hides sensitive fields)
    const { data: certBySerial } = await supabase
      .from("certificates_public")
      .select("*")
      .eq("serial_number", lookupKey)
      .maybeSingle();
    
    if (certBySerial) {
      certificate = certBySerial;
    } else {
      // If not found by serial, search all certificates and match by hash
      // This handles the hashed URL approach
      const { data: allCerts } = await supabase
        .from("certificates_public")
        .select("*")
        .not("solana_signature", "is", null) // Only minted certificates
        .limit(100);
      
      if (allCerts) {
        for (const cert of allCerts) {
          const certHash = await hashSerialNumber(cert.serial_number);
          if (certHash === lookupKey) {
            certificate = cert;
            break;
          }
        }
      }
    }

    if (!certificate) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get certificate image URL from metadata
    const metadata = certificate.metadata as {
      certificateImageUrl?: string;
      theme?: string;
    } | null;
    
    const certificateImageUrl =
      metadata?.certificateImageUrl ||
      certificate.product_images?.[0] ||
      "";

    // Fetch issuer profile for company name (using public view)
    let issuerName = "AuthentiSeal Verified Issuer";
    if (certificate.issuer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name, display_name")
        .eq("user_id", certificate.issuer_id)
        .maybeSingle();

      if (profile) {
        issuerName = profile.company_name || profile.display_name || issuerName;
      }
    }

    // Build NFT metadata following Metaplex standard
    // Note: Minimal sensitive data exposure
    const nftMetadata: NFTMetadata = {
      name: `COA: ${certificate.product_name}`.slice(0, 32),
      symbol: "ASEAL",
      description:
        certificate.product_description ||
        `Certificate of Authenticity for ${certificate.product_name}`,
      image: certificateImageUrl,
      external_url: `https://authenti-seek.lovable.app/verify?serial=${encodeURIComponent(certificate.serial_number)}`,
      attributes: [
        { trait_type: "Serial Number", value: certificate.serial_number },
        { trait_type: "Product Name", value: certificate.product_name },
        { trait_type: "Issuer", value: issuerName },
        {
          trait_type: "Issue Date",
          value: new Date(certificate.issued_at).toISOString().split("T")[0],
        },
        {
          trait_type: "Category",
          value: certificate.product_category || "General",
        },
        { trait_type: "Status", value: certificate.status },
        { trait_type: "Certificate Type", value: "Authenticity" },
        { trait_type: "Verification", value: "AuthentiSeal Verified" },
      ],
    };

    // Add current owner if transferred (wallet address is already public on-chain)
    if (certificate.current_owner_wallet) {
      nftMetadata.attributes.push({
        trait_type: "Current Owner",
        value: certificate.current_owner_wallet,
      });
    }

    // Note: Solana signature intentionally NOT included in metadata
    // - It's already available on-chain via the NFT's mint transaction
    // - Including it here would be redundant and could aid enumeration

    return new Response(JSON.stringify(nftMetadata), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
