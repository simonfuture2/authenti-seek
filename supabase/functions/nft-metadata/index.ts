import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract serial number from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const serialNumber = pathParts[pathParts.length - 1];

    if (!serialNumber || serialNumber === "nft-metadata") {
      return new Response(
        JSON.stringify({ error: "Serial number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch certificate by serial number
    const { data: certificate, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("serial_number", serialNumber)
      .single();

    if (error || !certificate) {
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

    // Fetch issuer profile for company name
    let issuerName = "AuthentiSeal Verified Issuer";
    if (certificate.issuer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name, display_name")
        .eq("user_id", certificate.issuer_id)
        .single();

      if (profile) {
        issuerName = profile.company_name || profile.display_name || issuerName;
      }
    }

    // Fetch version history
    const { data: versions } = await supabase
      .from("certificate_metadata_versions")
      .select("version_number, change_type, change_description, changed_at")
      .eq("certificate_id", certificate.id)
      .order("version_number", { ascending: true });

    // Build NFT metadata following Metaplex standard
    const nftMetadata: NFTMetadata = {
      name: `COA: ${certificate.product_name}`.slice(0, 32),
      symbol: "ASEAL",
      description:
        certificate.product_description ||
        `Certificate of Authenticity for ${certificate.product_name}`,
      image: certificateImageUrl,
      external_url: `https://authenti-seek.lovable.app/verify/${serialNumber}`,
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
        { trait_type: "Version", value: String(versions?.length || 1) },
      ],
    };

    // Add current owner if transferred
    if (certificate.current_owner_wallet) {
      nftMetadata.attributes.push({
        trait_type: "Current Owner",
        value: certificate.current_owner_wallet,
      });
    }

    // Add on-chain signature if minted
    if (certificate.solana_signature) {
      nftMetadata.attributes.push({
        trait_type: "Solana Signature",
        value: certificate.solana_signature,
      });
    }

    // Add version history to properties
    if (versions && versions.length > 0) {
      nftMetadata.properties = {
        version_history: versions.map((v) => ({
          version: v.version_number,
          change_type: v.change_type,
          description: v.change_description || "",
          timestamp: v.changed_at,
        })),
      };
    }

    return new Response(JSON.stringify(nftMetadata), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
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
