import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache the price for 5 minutes to avoid hitting rate limits
let cachedPrice: { price: number; source: string; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000;

const SOL_TOKEN_ADDRESS = "So11111111111111111111111111111111111111112";

async function fetchSolPrice(): Promise<{ price: number; source: string }> {
  // Check cache first
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION_MS) {
    console.log("Returning cached SOL price:", cachedPrice.price, "from", cachedPrice.source);
    return { price: cachedPrice.price, source: cachedPrice.source };
  }

  // Source 1: Solscan public API
  try {
    const response = await fetch(
      `https://public-api.solscan.io/market/token/${SOL_TOKEN_ADDRESS}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "AuthentiSeal/1.0",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      // The public API may return price in different fields
      const price = Number(data?.priceUsdt ?? data?.price ?? data?.market_data?.current_price?.usd ?? 0);
      if (price > 0) {
        cachedPrice = { price, source: "solscan", timestamp: Date.now() };
        console.log("Fetched SOL price from Solscan:", price);
        return { price, source: "solscan" };
      }
      console.warn("Solscan returned data but no valid price field. Keys:", Object.keys(data));
    } else {
      console.warn("Solscan API returned status:", response.status);
    }
  } catch (error) {
    console.warn("Solscan API error:", error);
  }

  // Source 2: Jupiter Price API (Solana-native, free)
  try {
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${SOL_TOKEN_ADDRESS}`,
      { headers: { "Accept": "application/json" } }
    );

    if (response.ok) {
      const data = await response.json();
      const price = Number(data?.data?.[SOL_TOKEN_ADDRESS]?.price ?? 0);
      if (price > 0) {
        cachedPrice = { price, source: "jupiter", timestamp: Date.now() };
        console.log("Fetched SOL price from Jupiter:", price);
        return { price, source: "jupiter" };
      }
    }
  } catch (error) {
    console.warn("Jupiter API error:", error);
  }

  // Source 3: CoinGecko free API
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { headers: { "Accept": "application/json" } }
    );

    if (response.ok) {
      const data = await response.json();
      const price = Number(data?.solana?.usd ?? 0);
      if (price > 0) {
        cachedPrice = { price, source: "coingecko", timestamp: Date.now() };
        console.log("Fetched SOL price from CoinGecko:", price);
        return { price, source: "coingecko" };
      }
    }
  } catch (error) {
    console.warn("CoinGecko API error:", error);
  }

  // Return stale cache if all sources fail
  if (cachedPrice) {
    console.warn("All APIs failed, returning stale cache:", cachedPrice.price);
    return { price: cachedPrice.price, source: cachedPrice.source };
  }

  throw new Error("Unable to fetch SOL price from any source");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { price, source } = await fetchSolPrice();

    return new Response(
      JSON.stringify({
        success: true,
        price_usd: price,
        currency: "USD",
        token: "SOL",
        source,
        cached: cachedPrice ? Date.now() - cachedPrice.timestamp > 1000 : false,
        fetched_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch SOL price",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
