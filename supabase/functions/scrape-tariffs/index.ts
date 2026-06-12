import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";

const SOURCES = [
  "https://en.wikipedia.org/wiki/China%E2%80%93United_States_trade_war",
  "https://en.wikipedia.org/wiki/Canada%E2%80%93United_States_trade_war",
  "https://en.wikipedia.org/wiki/Trump_tariffs",
];

async function scrapeUrl(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "TariffLens-Bot/1.0 (tariff-lens.onrender.com)" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 6000);
}

async function extractTariffsWithGroq(text: string, source: string): Promise<Array<{
  hs_code: string;
  product_name: string;
  destination_country: string;
  destination_code: string;
  mfn_rate: number;
  retaliation_rate: number;
  effective_rate: number;
  retaliation_note: string;
}>> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a trade data extractor. Extract tariff rates from text and return structured JSON only. Be precise with numbers.",
        },
        {
          role: "user",
          content: `Extract all specific tariff rates mentioned in this text that apply to US EXPORTS (goods leaving the US, being taxed by foreign countries).

Return a JSON array of objects. Each object must have exactly these fields:
- hs_code: string (4-digit HS code — use your knowledge to assign the right one, e.g. soybeans=1201, bourbon=2208, beef=0201, corn=1005, cars=8703, semiconductors=8542, steel=7208, aluminum=7606, aircraft=8802)
- product_name: string (clear product name)
- destination_country: string (full country name: China, European Union, Canada, Mexico, Japan, India, etc.)
- destination_code: string (2-letter code: CN, EU, CA, MX, JP, IN, etc.)
- mfn_rate: number (baseline MFN duty %, use 0 if unknown)
- retaliation_rate: number (retaliatory tariff % added by that country ON TOP of MFN)
- effective_rate: number (mfn_rate + retaliation_rate)
- retaliation_note: string (brief reason for retaliation)

Only include entries where a specific % rate is mentioned. Return [] if none found.
Return ONLY the JSON array, no explanation.

Text:
${text.substring(0, 4000)}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!resp.ok) throw new Error(`Groq error: ${resp.status}`);
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  const json = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = [];
    let totalUpserted = 0;

    for (const url of SOURCES) {
      try {
        const text = await scrapeUrl(url);
        const entries = await extractTariffsWithGroq(text, url);

        // Upsert into tariff_rates — this REPLACES seed data with live scraped data
        if (entries.length > 0) {
          const { error } = await supabase
            .from("tariff_rates")
            .upsert(
              entries.map(e => ({
                ...e,
                last_updated: new Date().toISOString().split("T")[0],
                synced_at: new Date().toISOString(),
              })),
              { onConflict: "hs_code,destination_country" }
            );
          if (error) console.error("Upsert error:", error);
          else totalUpserted += entries.length;
        }

        // Log the scrape
        await supabase.from("scrape_log").insert({
          source_url: url,
          source_label: url.includes("China") ? "Wikipedia: US-China Trade War" :
                        url.includes("Canada") ? "Wikipedia: US-Canada Trade War" :
                        "Wikipedia: Trump Tariffs",
          mentions_found: entries.length,
          raw_sample: entries.length > 0
            ? entries.slice(0, 2).map(e => `${e.product_name} → ${e.destination_country}: ${e.effective_rate}%`).join(" | ")
            : "No new rates found",
          scraped_at: new Date().toISOString(),
        });

        results.push({ url, entries_found: entries.length, sample: entries[0] ?? null });
      } catch (err) {
        results.push({ url, entries_found: 0, error: String(err) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scraped_at: new Date().toISOString(),
      total_upserted: totalUpserted,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
