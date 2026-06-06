import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Source registry ────────────────────────────────────────────────────────
const SOURCES: Array<{
  url: string;
  authority: string;
  corridor: string;
  keywords: string[];
  type: "rss" | "html";
}> = [
  // ── India central govt ────────────────────────────────────────────────
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
    authority: "DGFT",
    corridor: "All",
    type: "rss",
    keywords: ["export", "import", "trade", "foreign trade", "dgft", "ftp", "iec", "hsn", "customs", "nepal", "bhutan", "bangladesh"],
  },
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=9&Lang=1&Regid=3",
    authority: "CBIC",
    corridor: "All",
    type: "rss",
    keywords: ["customs", "duty", "tariff", "notification", "circular", "cbic", "eway", "e-way", "bill of entry", "shipping bill"],
  },
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=4&Lang=1&Regid=3",
    authority: "RBI",
    corridor: "All",
    type: "rss",
    keywords: ["fema", "remittance", "forex", "foreign exchange", "lc", "letter of credit", "trade finance"],
  },
  {
    url: "https://www.cbic.gov.in/entities/cbicrss",
    authority: "CBIC",
    corridor: "All",
    type: "rss",
    keywords: ["customs", "duty", "tariff", "notification", "circular", "eway", "export", "import", "hsn"],
  },
  {
    url: "https://www.dgft.gov.in/CP/?opt=rss&val=public_notice",
    authority: "DGFT",
    corridor: "All",
    type: "rss",
    keywords: ["export", "import", "ftp", "iec", "license", "authorization", "public notice", "trade policy"],
  },
  {
    url: "https://pib.gov.in/RssMain.aspx?ModId=12&Lang=1&Regid=3",
    authority: "MoCI",
    corridor: "All",
    type: "rss",
    keywords: ["trade", "export", "import", "commerce", "nepal", "bhutan", "bangladesh", "bilateral", "treaty", "corridor"],
  },
  // ── Nepal ─────────────────────────────────────────────────────────────
  {
    url: "https://ird.gov.np/rss/en",
    authority: "IRD-Nepal",
    corridor: "India-Nepal",
    type: "rss",
    keywords: ["customs", "vat", "duty", "tariff", "trade", "import", "export", "revenue"],
  },
  {
    url: "https://www.customs.gov.np/en/notices",
    authority: "Nepal-Customs",
    corridor: "India-Nepal",
    type: "html",
    keywords: ["customs", "duty", "valuation", "declaration", "tariff", "import", "export", "birgunj"],
  },
  {
    url: "https://www.mof.gov.np/en/press-release",
    authority: "Nepal-MoF",
    corridor: "India-Nepal",
    type: "html",
    keywords: ["budget", "revenue", "customs", "duty", "tariff", "trade", "import"],
  },
  // ── Bangladesh ────────────────────────────────────────────────────────
  {
    url: "https://nbr.gov.bd/rss.xml",
    authority: "NBR-Bangladesh",
    corridor: "India-Bangladesh",
    type: "rss",
    keywords: ["customs", "duty", "vat", "tariff", "import", "export", "trade", "india"],
  },
  {
    url: "https://www.customs.gov.bd/en/news-notice",
    authority: "Bangladesh-Customs",
    corridor: "India-Bangladesh",
    type: "html",
    keywords: ["customs", "benapole", "petrapole", "india", "duty", "tariff", "import", "export"],
  },
  // ── Bhutan ────────────────────────────────────────────────────────────
  {
    url: "https://www.mof.gov.bt/category/press-release/feed/",
    authority: "Bhutan-MoF",
    corridor: "India-Bhutan",
    type: "rss",
    keywords: ["trade", "customs", "duty", "tariff", "import", "export", "india", "phuentsholing", "jaigaon"],
  },
  {
    url: "https://www.rca.gov.bt/news",
    authority: "Bhutan-RCA",
    corridor: "India-Bhutan",
    type: "html",
    keywords: ["freight", "transport", "truck", "permit", "vehicle", "customs"],
  },
  // ── Trade news ────────────────────────────────────────────────────────
  {
    url: "https://www.thehindubusinessline.com/economy/logistics/feeder.xml",
    authority: "Hindu-BL",
    corridor: "All",
    type: "rss",
    keywords: ["customs", "dgft", "export", "import", "trade policy", "nepal", "bhutan", "bangladesh", "logistics", "freight"],
  },
  {
    url: "https://economictimes.indiatimes.com/rssfeeds/7771250.cms",
    authority: "ET-Trade",
    corridor: "All",
    type: "rss",
    keywords: ["customs", "dgft", "trade", "export", "import", "nepal", "bhutan", "bangladesh", "cbic", "ftp"],
  },
  {
    url: "https://www.livemint.com/rss/economy",
    authority: "Mint",
    corridor: "All",
    type: "rss",
    keywords: ["customs", "dgft", "export", "import", "trade", "cbic", "nepal", "bhutan", "bangladesh"],
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

// ── Summarize with Gemini ─────────────────────────────────────────────────
async function summarize(title: string, description: string, corridor: string): Promise<string> {
  const key = getGeminiKey();
  const prompt = `You summarize trade regulations for export operations teams on the ${corridor} corridor (India ↔ Nepal/Bhutan/Bangladesh road freight).

Summarize in 2 sentences. Be specific: what changed, who is affected, and any deadlines or dates.

Title: ${title}
Content: ${description.slice(0, 800)}

If the content is not actually a regulation or trade news update, reply only: NOT_RELEVANT`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      }),
    }
  );
  if (!res.ok) return description.slice(0, 300);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? description.slice(0, 300);
}

// ── Extract items from HTML using Gemini ──────────────────────────────────
async function extractFromHTML(
  html: string,
  sourceUrl: string,
  authority: string,
): Promise<Array<{ title: string; description: string; link: string; pubDate: string }>> {
  const key = getGeminiKey();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 3000);

  const prompt = `Extract trade regulation notices or news items from this webpage text. Return a JSON array of up to 8 items:
[{"title":"...", "description":"...", "link":"...", "pubDate":"..."}]

Rules:
- Only include items about customs, trade policy, duty, tariff, import/export regulations, or transport permits
- link and pubDate can be empty string if not found
- If nothing relevant, return []

Source: ${sourceUrl}
Text:
${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}

// ── Parse RSS XML ─────────────────────────────────────────────────────────
function parseRSS(xml: string): Array<{ title: string; description: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] ??
      item.match(/<title>(.*?)<\/title>/s)?.[1] ?? ""
    ).trim();
    const description = (
      item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1] ??
      item.match(/<description>(.*?)<\/description>/s)?.[1] ?? ""
    ).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const link = (
      item.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/s)?.[1] ??
      item.match(/<link>(.*?)<\/link>/s)?.[1] ?? ""
    ).trim();
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "").trim();
    if (title) items.push({ title, description, link, pubDate });
  }
  return items.slice(0, 12);
}

function isRelevant(item: { title: string; description: string }, keywords: string[]): boolean {
  const text = (item.title + " " + item.description).toLowerCase();
  return keywords.some(k => text.includes(k.toLowerCase()));
}

function detectCorridor(text: string, fallback: string): string {
  const t = text.toLowerCase();
  if (t.includes("nepal") || t.includes("birgunj") || t.includes("raxaul") || t.includes("biratnagar")) return "India-Nepal";
  if (t.includes("bangladesh") || t.includes("benapole") || t.includes("petrapole") || t.includes("dhaka")) return "India-Bangladesh";
  if (t.includes("bhutan") || t.includes("phuentsholing") || t.includes("jaigaon") || t.includes("thimphu")) return "India-Bhutan";
  return fallback;
}

function detectTags(text: string, authority: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (t.includes("hsn") || t.includes("tariff") || t.includes("classification")) tags.push("HSN/tariff");
  if (t.includes("gstin") || t.includes("gst")) tags.push("GST");
  if (t.includes("lc") || t.includes("letter of credit")) tags.push("LC");
  if (t.includes("freight") || t.includes("transport") || t.includes("lorry") || t.includes("truck") || t.includes("bilty")) tags.push("freight");
  if (t.includes("customs") || t.includes("duty") || t.includes("clearance")) tags.push("customs");
  if (t.includes("eway") || t.includes("e-way")) tags.push("eway-bill");
  if (t.includes("iec") || t.includes("import export code")) tags.push("IEC");
  if (t.includes("fema") || t.includes("remittance") || t.includes("forex")) tags.push("FEMA");
  if (t.includes("permit") || t.includes("vehicle") || t.includes("driver")) tags.push("vehicle-permit");
  if (t.includes("valuation") || t.includes("invoice") || t.includes("declared value")) tags.push("valuation");
  if (t.includes("ban") || t.includes("prohibited") || t.includes("restricted")) tags.push("prohibited-goods");
  if (t.includes("bilateral") || t.includes("treaty") || t.includes("agreement") || t.includes("mou")) tags.push("bilateral-treaty");
  if (tags.length === 0) tags.push("general");
  tags.push(authority.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  return tags;
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPA_URL") ?? "",
    Deno.env.get("SUPA_SECRET") ?? ""
  );

  const results = {
    sources_attempted: SOURCES.length,
    scraped: 0,
    relevant: 0,
    inserted: 0,
    skipped_duplicate: 0,
    skipped_irrelevant: 0,
    errors: [] as string[],
  };

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AbilityTradeBot/1.0)",
          "Accept": "application/rss+xml, application/xml, text/xml, text/html, */*",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        results.errors.push(`${source.authority}: HTTP ${res.status}`);
        continue;
      }

      const body = await res.text();
      let items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];

      if (source.type === "rss") {
        items = parseRSS(body);
      } else {
        items = await extractFromHTML(body, source.url, source.authority);
        await new Promise(r => setTimeout(r, 800));
      }

      results.scraped += items.length;

      for (const item of items) {
        if (!isRelevant(item, source.keywords)) {
          results.skipped_irrelevant++;
          continue;
        }
        results.relevant++;

        const titleKey = item.title.slice(0, 200);

        const { data: existing } = await supabase
          .from("regulations")
          .select("id")
          .eq("title", titleKey)
          .single();

        if (existing) {
          results.skipped_duplicate++;
          continue;
        }

        const text = item.title + " " + item.description;
        const corridor = detectCorridor(text, source.corridor);
        const tags = detectTags(text, source.authority);

        let summary = item.description.slice(0, 300);
        try {
          const raw = await summarize(item.title, item.description, corridor);
          if (raw === "NOT_RELEVANT") { results.skipped_irrelevant++; continue; }
          summary = raw;
        } catch { /* use raw description */ }

        let link = item.link || source.url;
        if (link && link.startsWith("/")) {
          const base = new URL(source.url);
          link = `${base.protocol}//${base.host}${link}`;
        }

        let effectiveDate: string | null = null;
        if (item.pubDate) {
          try { effectiveDate = new Date(item.pubDate).toISOString().split("T")[0]; } catch { /* skip */ }
        }

        const { error } = await supabase.from("regulations").insert({
          authority: source.authority,
          corridor,
          title: titleKey,
          summary,
          source_url: link,
          effective_date: effectiveDate,
          tags,
        });

        if (error) results.errors.push(`Insert [${source.authority}]: ${error.message}`);
        else results.inserted++;

        await new Promise(r => setTimeout(r, 400));
      }
    } catch (e) {
      results.errors.push(`${source.authority}: ${String(e).slice(0, 120)}`);
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
