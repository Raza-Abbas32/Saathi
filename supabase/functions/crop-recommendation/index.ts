import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an expert agronomist specializing in Pakistani agriculture. Given a farmer's soil type, province/region, season, and water availability, recommend the most suitable crops to plant.

Respond ONLY with a JSON array of 3 to 5 recommended crops, each with these fields:
{
  "crop_name": "Name of the crop",
  "expected_yield": "Typical yield range with units (e.g. '40-50 maunds per acre')",
  "growth_duration": "Typical growth duration (e.g. '120-150 days')",
  "water_requirement": "Water needs description (e.g. 'Moderate (4-6 irrigations)')",
  "reason": "1-2 sentence explanation of why this crop fits the given soil, region, season, and water availability",
  "profitability": "One of: 'high', 'medium', 'low'"
}

Important rules:
- Recommendations must genuinely reflect the given soil type, region, season, and water availability — do not give generic or unrelated crops.
- Order recommendations from most to least suitable.
- Use crops and practices realistic for Pakistani farming conditions.
- Respond ONLY with the JSON array, no additional text or markdown formatting.`;

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
    const { soil, region, season, water } = await req.json();

    if (!soil || !region || !season || !water) {
      return new Response(
        JSON.stringify({ error: "soil, region, season, and water are all required" }),
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

    const userPrompt = `Soil type: ${soil}\nProvince/Region: ${region}\nSeason: ${season}\nWater availability: ${water}\n\nRecommend the best crops for these conditions.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1536,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "The recommendation service returned an error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawReply) {
      return new Response(
        JSON.stringify({ error: "The recommendation service returned an empty response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    try {
      result = JSON.parse(rawReply);
    } catch {
      const jsonMatch = rawReply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ error: "Could not parse the recommendation result. Please try again." }),
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
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
