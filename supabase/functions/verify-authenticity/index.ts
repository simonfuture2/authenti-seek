import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationRequest {
  certificateId: string;
  // Certificate data from DB
  certificateImages: string[];
  productName: string;
  productDescription?: string;
  physicalAttributes?: {
    weight?: string;
    dimensions?: string;
    materials?: string;
    color?: string;
    [key: string]: string | undefined;
  };
  uniqueIdentifiers?: {
    serialNumber?: string;
    nfcTagId?: string;
    batchCode?: string;
    modelNumber?: string;
    [key: string]: string | undefined;
  };
  // Verifier input
  verificationPhotos: string[]; // Base64 or URLs of photos taken by verifier
  reportedIdentifiers: {
    serialNumber?: string;
    nfcTagId?: string;
    batchCode?: string;
    modelNumber?: string;
    [key: string]: string | undefined;
  };
  reportedAttributes: {
    weight?: string;
    dimensions?: string;
    materials?: string;
    color?: string;
    [key: string]: string | undefined;
  };
}

interface VerificationResult {
  overallConfidence: number;
  imageConfidence: number;
  attributeConfidence: number;
  identifierConfidence: number;
  resultStatus: "authentic" | "suspicious" | "counterfeit";
  analysis: string;
  attributeMatches: Record<string, { matches: boolean; notes: string }>;
  identifierMatches: Record<string, { matches: boolean; notes: string }>;
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

    const request: VerificationRequest = await req.json();

    // Build comparison prompt for AI analysis
    const prompt = buildVerificationPrompt(request);

    console.log("Requesting AI verification analysis...");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are an expert authenticity verification specialist for luxury goods, collectibles, and valuable assets. Your task is to analyze verification data and provide a confidence assessment.

You must respond using the verify_authenticity function with your analysis.

Key verification criteria:
1. IMAGE COMPARISON: Analyze if the verification photos match the certificate images (materials, craftsmanship, details, wear patterns)
2. ATTRIBUTE VERIFICATION: Compare reported physical measurements against certificate specifications
3. IDENTIFIER MATCHING: Verify serial numbers, NFC tags, batch codes match exactly
4. OVERALL ASSESSMENT: Combine all factors for a final confidence score

Scoring guidelines:
- 90-100%: Strong match, high confidence in authenticity
- 70-89%: Good match with minor discrepancies
- 50-69%: Moderate concerns, some mismatches
- 30-49%: Significant discrepancies, suspicious
- 0-29%: Major red flags, likely counterfeit

Be thorough but fair. Minor variations due to lighting or measurement precision are acceptable.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "verify_authenticity",
                description:
                  "Submit the verification analysis results with confidence scores and detailed findings.",
                parameters: {
                  type: "object",
                  properties: {
                    overallConfidence: {
                      type: "number",
                      description:
                        "Overall confidence score from 0-100 that the item is authentic",
                    },
                    imageConfidence: {
                      type: "number",
                      description:
                        "Confidence score from 0-100 based on image comparison",
                    },
                    attributeConfidence: {
                      type: "number",
                      description:
                        "Confidence score from 0-100 based on physical attribute matching",
                    },
                    identifierConfidence: {
                      type: "number",
                      description:
                        "Confidence score from 0-100 based on unique identifier matching",
                    },
                    resultStatus: {
                      type: "string",
                      enum: ["authentic", "suspicious", "counterfeit"],
                      description: "Overall verification result status",
                    },
                    analysis: {
                      type: "string",
                      description:
                        "Detailed analysis explaining the verification findings, concerns, and recommendations",
                    },
                    attributeMatches: {
                      type: "object",
                      description:
                        "Object mapping each attribute to match status and notes",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          matches: { type: "boolean" },
                          notes: { type: "string" },
                        },
                        required: ["matches", "notes"],
                      },
                    },
                    identifierMatches: {
                      type: "object",
                      description:
                        "Object mapping each identifier to match status and notes",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          matches: { type: "boolean" },
                          notes: { type: "string" },
                        },
                        required: ["matches", "notes"],
                      },
                    },
                  },
                  required: [
                    "overallConfidence",
                    "imageConfidence",
                    "attributeConfidence",
                    "identifierConfidence",
                    "resultStatus",
                    "analysis",
                    "attributeMatches",
                    "identifierMatches",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "verify_authenticity" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded, please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add funds to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();

    // Extract the function call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "verify_authenticity") {
      throw new Error("Invalid AI response format");
    }

    const result: VerificationResult = JSON.parse(toolCall.function.arguments);

    console.log("Verification complete:", {
      overallConfidence: result.overallConfidence,
      status: result.resultStatus,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verification error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildVerificationPrompt(request: VerificationRequest): string {
  const parts: string[] = [];

  parts.push(`## Product Verification Request`);
  parts.push(`**Product:** ${request.productName}`);
  if (request.productDescription) {
    parts.push(`**Description:** ${request.productDescription}`);
  }
  parts.push("");

  // Certificate images
  if (request.certificateImages?.length > 0) {
    parts.push(`### Certificate Images (${request.certificateImages.length})`);
    parts.push(
      "These are the official product images from the certificate of authenticity:"
    );
    request.certificateImages.forEach((url, i) => {
      parts.push(`- Image ${i + 1}: ${url}`);
    });
    parts.push("");
  }

  // Verification photos
  if (request.verificationPhotos?.length > 0) {
    parts.push(
      `### Verification Photos (${request.verificationPhotos.length})`
    );
    parts.push(
      "These are photos taken by the verifier of the physical item being verified:"
    );
    request.verificationPhotos.forEach((url, i) => {
      parts.push(`- Photo ${i + 1}: ${url}`);
    });
    parts.push("");
  }

  // Physical attributes comparison
  parts.push(`### Physical Attributes Comparison`);
  parts.push("| Attribute | Certificate Value | Reported Value |");
  parts.push("|-----------|------------------|----------------|");

  const allAttributes = new Set([
    ...Object.keys(request.physicalAttributes || {}),
    ...Object.keys(request.reportedAttributes || {}),
  ]);

  allAttributes.forEach((attr) => {
    const certValue = request.physicalAttributes?.[attr] || "Not specified";
    const reportedValue = request.reportedAttributes?.[attr] || "Not provided";
    parts.push(`| ${attr} | ${certValue} | ${reportedValue} |`);
  });
  parts.push("");

  // Unique identifiers comparison
  parts.push(`### Unique Identifiers Comparison`);
  parts.push("| Identifier | Certificate Value | Reported Value |");
  parts.push("|------------|------------------|----------------|");

  const allIdentifiers = new Set([
    ...Object.keys(request.uniqueIdentifiers || {}),
    ...Object.keys(request.reportedIdentifiers || {}),
  ]);

  allIdentifiers.forEach((id) => {
    const certValue = request.uniqueIdentifiers?.[id] || "Not specified";
    const reportedValue = request.reportedIdentifiers?.[id] || "Not provided";
    parts.push(`| ${id} | ${certValue} | ${reportedValue} |`);
  });
  parts.push("");

  parts.push(
    "Please analyze all the above data and provide your verification assessment."
  );

  return parts.join("\n");
}
