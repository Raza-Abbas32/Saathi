import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const apiKey = await getGeminiKey();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. The Gemini API key needs to be set." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Extract keywords from the user's latest message ──────────────
    const latestUserMessage = [...messages]
      .reverse()
      .find((m: { role: string; content: string }) => m.role === "user");

    const userQuery = latestUserMessage?.content ?? "";

    const keywords = userQuery
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length >= 3)
      .slice(0, 6);

    // ── Step 2: Query marketplace_listings ───────────────────────────────────
    let listings: Record<string, unknown>[] = [];

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const orFilters = keywords.flatMap((kw: string) => [
        `crop_name.ilike.%${kw}%`,
        `location.ilike.%${kw}%`,
      ]);

      const filterStr = orFilters.length > 0 ? orFilters.join(",") : undefined;

      let query = supabase
        .from("marketplace_listings")
        .select("id,crop_name,quantity,price_per_unit,location,farmer_name,description,created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (filterStr) {
        query = query.or(filterStr);
      }

      const { data, error } = await query;

      if (!error && data) {
        listings = data;
      }
    }

    // ── Step 3: Serialize retrieved listings as grounding context ────────────
    const listingsContext =
      listings.length > 0
        ? listings
            .map(
              (l, i) =>
                `Listing ${i + 1}:\n` +
                `  Crop: ${l.crop_name}\n` +
                `  Quantity: ${l.quantity}\n` +
                `  Price: ${l.price_per_unit}\n` +
                `  Location: ${l.location}\n` +
                `  Seller: ${l.farmer_name}\n` +
                `  Description: ${l.description ?? "N/A"}\n` +
                `  Posted: ${l.created_at}`
            )
            .join("\n\n")
        : "No matching listings were found in the database.";

    // ── Step 4: Build Gemini request with RAG grounding ──────────────────────
    const SYSTEM_PROMPT = `You are the Saathi Marketplace Assistant, helping Pakistani farmers find buyers and sellers on the Saathi marketplace.

REAL LISTINGS RETRIEVED FROM THE DATABASE FOR THIS QUERY:
${listingsContext}

STRICT RULES — follow these exactly:
1. Answer the user's question using ONLY the listings provided above.
2. If the listings section says "No matching listings were found", tell the user honestly that there are no matching listings currently available — do NOT invent or suggest any listing, price, seller name, or location.
3. Never fabricate, guess, or assume the existence of any listing not present in the data above.
4. If listings are present, summarize them helpfully — mention crop name, price, location, and seller name.
5. Keep responses concise and practical for Pakistani farmers.
6. You may answer follow-up questions about the real listings shown above (e.g. "which one is cheapest?") since that is reasoning over real data, not fabrication.`;

    const conversationHistory = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            topP: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "The AI service returned an error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return new Response(
        JSON.stringify({ error: "The AI service returned an empty response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ reply }),
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
