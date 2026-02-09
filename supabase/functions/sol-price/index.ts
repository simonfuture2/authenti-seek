import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache the price for 5 minutes to avoid hitting rate limits
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const SOL_TOKEN_ADDRESS = "So11111111111111111111111111111111111111112";

async function fetchSolPrice(): Promise<number> {
  // Check cache first
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION_MS) {
    console.log("Returning cached SOL price:", cachedPrice.price);
    return cachedPrice.price;
  }

  // Try Solscan public API first
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
      if (data?.priceUsdt || data?.price) {
        const price = Number(data.priceUsdt || data.price);
        if (price > 0) {
          cachedPrice = { price, timestamp: Date.now() };
          console.log("Fetched SOL price from Solscan:", price);
          return price;
        }
      }
    }
    console.warn("Solscan public API returned unexpected data, trying fallback");
  } catch (error) {
    console.warn("Solscan public API failed:", error);
  }

  // Fallback: CoinGecko free API
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const price = data?.solana?.usd;
      if (price && price > 0) {
        cachedPrice = { price, timestamp: Date.now() };
        console.log("Fetched SOL price from CoinGecko fallback:", price);
        return price;
      }
    }
  } catch (error) {
    console.warn("CoinGecko fallback failed:", error);
  }

  // If we have a stale cache, return it rather than failing
  if (cachedPrice) {
    console.warn("All APIs failed, returning stale cached price:", cachedPrice.price);
    return cachedPrice.price;
  }

  throw new Error("Unable to fetch SOL price from any source");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const price = await fetchSolPrice();

    return new Response(
      JSON.stringify({
        success: true,
        price_usd: price,
        currency: "USD",
        token: "SOL",
        source: "solscan",
        cached: cachedPrice ? Date.now() - cachedPrice.timestamp < 1000 ? false : true : false,
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
