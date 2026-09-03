import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an expert plant pathologist and agricultural AI assistant specializing in crop disease detection for Pakistani agriculture. You analyze plant images and provide detailed disease diagnosis.

When analyzing an image, provide a JSON response with these fields:
{
  "disease_name": "Name of the detected disease or condition (or 'Healthy' if no disease)",
  "confidence": "Confidence percentage as a number 0-100",
  "severity": "One of: 'low', 'moderate', 'high', 'severe', or 'none' if healthy",
  "crop_identified": "The crop/plant species identified",
  "description": "Brief description of the disease/condition (2-3 sentences)",
  "treatment": ["Array of 2-5 specific treatment steps"],
  "prevention": ["Array of 2-5 prevention tips for future"]
}

Important rules:
- If you cannot clearly identify the plant or disease, set confidence below 50 and note the uncertainty in the description
- Always provide practical, actionable advice relevant to Pakistani farming conditions
- Treatment and prevention should use commonly available products and methods in Pakistan
- Respond ONLY with the JSON object, no additional text`;

async function getGeminiKey(): Promise<string | undefined> {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey) return envKey;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return undefined;

  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await sb
    .from("app_secrets")
    .select("value")
    .eq("key", "GEMINI_API_KEY")
    .maybeSingle();
  return data?.value ?? undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { image, mimeType } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = await getGeminiKey();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. The Gemini API key needs to be set." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{
            role: "user",
            parts: [
              { text: "Analyze this plant/crop image for diseases. Provide the diagnosis as a JSON object." },
              { inline_data: { mime_type: mimeType || "image/jpeg", data: image } },
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "The analysis service returned an error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawReply) {
      return new Response(
        JSON.stringify({ error: "The analysis service returned an empty response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    try {
      result = JSON.parse(rawReply);
    } catch {
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ error: "Could not parse the analysis result. Please try again." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred during analysis. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
