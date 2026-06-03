import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── RSS Sources ────────────────────────────────────────────────────────────
const SOURCES = [
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
    authority: "DGFT",
    corridor: "All",
    keywords: ["export", "import", "trade", "foreign trade", "dgft", "ftp", "iec", "hsn", "customs"],
  },
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=9&Lang=1&Regid=3",
    authority: "CBIC",
    corridor: "All",
    keywords: ["customs", "duty", "tariff", "notification", "circular", "cbic", "eway", "e-way"],
  },
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=4&Lang=1&Regid=3",
    authority: "RBI",
    corridor: "All",
    keywords: ["fema", "remittance", "forex", "foreign exchange", "lc", "letter of credit", "trade finance"],
  },
];

// ── Gemini key rotation ────────────────────────────────────────────────────
function getGeminiKey(): string {
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
    Deno.env.get("GEMINI_API_KEY_8"),
    Deno.env.get("GEMINI_API_KEY_9"),
    Deno.env.get("GEMINI_API_KEY_10"),
    Deno.env.get("GEMINI_API_KEY_11"),
  ].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error("No Gemini keys configured");
  return keys[Math.floor(Date.now() / 60000) % keys.length];
}

// ── Summarize with Gemini (minimal tokens) ────────────────────────────────
async function summarize(title: string, description: string): Promise<string> {
  const key = getGeminiKey();
  const prompt = `Summarize this trade regulation in 2 sentences for an export operations team. Be specific about what changed and who it affects.\n\nTitle: ${title}\nContent: ${description.slice(0, 500)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? description.slice(0, 200);
}

// ── Parse RSS XML ─────────────────────────────────────────────────────────
function parseRSS(xml: string): Array<{ title: string; description: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ??
      item.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s)?.[1] ??
      item.match(/<description>(.*?)<\/description>/s)?.[1] ?? "";
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    if (title) items.push({ title, description: description.replace(/<[^>]*>/g, "").trim(), link, pubDate });
  }
  return items.slice(0, 10); // max 10 per source
}

// ── Check if item is trade-relevant ──────────────────────────────────────
function isRelevant(item: { title: string; description: string }, keywords: string[]): boolean {
  const text = (item.title + " " + item.description).toLowerCase();
  return keywords.some(k => text.includes(k));
}

// ── Detect corridor from content ─────────────────────────────────────────
function detectCorridor(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("nepal") || t.includes("birgunj") || t.includes("raxaul")) return "India-Nepal";
  if (t.includes("bangladesh") || t.includes("benapole") || t.includes("petrapole")) return "India-Bangladesh";
  if (t.includes("bhutan") || t.includes("phuentsholing") || t.includes("jaigaon")) return "India-Bhutan";
  return "All";
}

// ── Detect tags from content ──────────────────────────────────────────────
function detectTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (t.includes("hsn") || t.includes("tariff")) tags.push("HSN");
  if (t.includes("gstin") || t.includes("gst")) tags.push("GST");
  if (t.includes("lc") || t.includes("letter of credit")) tags.push("LC");
  if (t.includes("freight") || t.includes("transport")) tags.push("freight");
  if (t.includes("customs") || t.includes("duty")) tags.push("customs");
  if (t.includes("eway") || t.includes("e-way")) tags.push("eway-bill");
  if (t.includes("iec") || t.includes("import export code")) tags.push("IEC");
  if (t.includes("fema") || t.includes("remittance") || t.includes("forex")) tags.push("FEMA");
  return tags.length > 0 ? tags : ["general"];
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPA_URL") ?? "",
    Deno.env.get("SUPA_SECRET") ?? ""
  );

  const results = { scraped: 0, inserted: 0, skipped: 0, errors: [] as string[] };

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AbilityBot/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) { results.errors.push(`${source.authority}: HTTP ${res.status}`); continue; }

      const xml = await res.text();
      const items = parseRSS(xml);
      results.scraped += items.length;

      for (const item of items) {
        if (!isRelevant(item, source.keywords)) { results.skipped++; continue; }

        // Check if already exists by title
        const { data: existing } = await supabase
          .from("regulations")
          .select("id")
          .eq("title", item.title.slice(0, 200))
          .single();

        if (existing) { results.skipped++; continue; }

        // Summarize with Gemini (only for new relevant items)
        let summary = item.description.slice(0, 300);
        try { summary = await summarize(item.title, item.description); } catch { /* use raw description */ }

        const text = item.title + " " + item.description;
        const corridor = detectCorridor(text) || source.corridor;
        const tags = detectTags(text);

        // Parse date
        let effectiveDate: string | null = null;
        if (item.pubDate) {
          try { effectiveDate = new Date(item.pubDate).toISOString().split("T")[0]; } catch { /* skip */ }
        }

        const { error } = await supabase.from("regulations").insert({
          authority: source.authority,
          corridor,
          title: item.title.slice(0, 200),
          summary,
          source_url: item.link || source.url,
          effective_date: effectiveDate,
          tags,
        });

        if (error) results.errors.push(`Insert error: ${error.message}`);
        else results.inserted++;

        // Small delay to avoid hammering Gemini
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      results.errors.push(`${source.authority}: ${String(e)}`);
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
