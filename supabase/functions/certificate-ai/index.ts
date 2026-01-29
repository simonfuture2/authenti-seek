import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AIAction = 
  | "generate_description"
  | "analyze_authenticity"
  | "generate_seal_design"
  | "enhance_certificate";

interface AIRequest {
  action: AIAction;
  productName?: string;
  productCategory?: string;
  productImageUrl?: string;
  existingDescription?: string;
  serialNumber?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { action, productName, productCategory, productImageUrl, existingDescription, serialNumber }: AIRequest = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_description":
        systemPrompt = `You are an expert product description writer for luxury goods and collectibles. 
You write professional, compelling descriptions for Certificates of Authenticity. 
Keep descriptions concise (2-3 sentences), highlighting authenticity, craftsmanship, and value.
Do not use markdown formatting - return plain text only.`;
        userPrompt = `Write a professional product description for a Certificate of Authenticity.
Product Name: ${productName}
Category: ${productCategory || "General"}
${existingDescription ? `Additional details: ${existingDescription}` : ""}

Write a compelling 2-3 sentence description that emphasizes authenticity and quality.`;
        break;

      case "analyze_authenticity":
        systemPrompt = `You are an AI authenticity analyst for the AuthentiSeal blockchain verification platform.
You provide professional authenticity assessments based on product information.
Return a JSON object with: score (0-100), confidence (high/medium/low), factors (array of strings), recommendation (string).
Only return valid JSON, no markdown.`;
        userPrompt = `Analyze the authenticity potential for this product:
Product Name: ${productName}
Category: ${productCategory || "General"}
Serial Number: ${serialNumber}
${productImageUrl ? "Has product image: Yes" : "Has product image: No"}

Provide an authenticity analysis as a JSON object.`;
        break;

      case "generate_seal_design":
        systemPrompt = `You are a creative designer specializing in authentication seals and emblems.
You suggest unique design elements for digital authentication seals.
Return a JSON object with: pattern (string), symbolism (string), colorAccent (string hex color), tagline (string max 20 chars).
Only return valid JSON, no markdown.`;
        userPrompt = `Design a unique authentication seal concept for:
Product: ${productName}
Category: ${productCategory || "General"}

Suggest creative seal design elements as a JSON object.`;
        break;

      case "enhance_certificate":
        systemPrompt = `You are an AI assistant helping enhance Certificate of Authenticity content.
Provide suggestions to improve the certificate's professionalism and appeal.
Return a JSON object with: headline (string), subtitle (string), qualityMarkers (array of 3 strings).
Only return valid JSON, no markdown.`;
        userPrompt = `Enhance the certificate content for:
Product: ${productName}
Category: ${productCategory || "General"}
Description: ${existingDescription || "Not provided"}

Suggest enhancements as a JSON object.`;
        break;

      default:
        throw new Error("Invalid action specified");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON responses for certain actions
    let result: unknown = content;
    if (["analyze_authenticity", "generate_seal_design", "enhance_certificate"].includes(action)) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If parsing fails, return the raw content
        console.warn("Failed to parse JSON from AI response:", content);
      }
    }

    return new Response(
      JSON.stringify({ success: true, result, action }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Certificate AI error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
