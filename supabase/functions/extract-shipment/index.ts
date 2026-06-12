import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_base64, file_name, file_type } = await req.json();
    if (!file_base64) throw new Error("No file provided");

    // Strip the data:...;base64, prefix if present
    const base64Data = file_base64.includes(",") ? file_base64.split(",")[1] : file_base64;
    const mediaType = file_type?.startsWith("image/") ? file_type : "image/jpeg";

    const isImage = file_type?.startsWith("image/") || file_name?.match(/\.(jpg|jpeg|png|webp)$/i);

    let messages;

    if (isImage) {
      messages = [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mediaType};base64,${base64Data}` },
            },
            {
              type: "text",
              text: `You are a trade document parser. Extract the following fields from this trade document (invoice, packing list, bill of lading, etc.) and return ONLY valid JSON with these exact keys:
{
  "product_name": "string — the main product being shipped",
  "hs_code": "string — HS/HTS code (4-6 digit, numbers only, no dots). Use your knowledge if implied but not explicit.",
  "destination_country": "string — destination country full name (e.g. China, Germany, Canada)",
  "shipment_value": number — total value in USD (convert if needed, use 0 if not found),
  "currency": "string — original currency if not USD",
  "exporter_name": "string — exporting company name",
  "notes": "string — any tariff-relevant notes"
}
Return ONLY the JSON object. No explanation.`,
            },
          ],
        },
      ];
    } else {
      // For PDFs, use text extraction via Mistral
      messages = [
        {
          role: "user",
          content: `You are a trade document parser. The following is a base64-encoded PDF trade document.
Extract the key shipment fields and return ONLY valid JSON:
{
  "product_name": "string",
  "hs_code": "string — 4-6 digit HS code, numbers only",
  "destination_country": "string — full country name",
  "shipment_value": number,
  "currency": "string",
  "exporter_name": "string",
  "notes": "string"
}
Document (base64): ${base64Data.substring(0, 2000)}...
Return ONLY the JSON.`,
        },
      ];
    }

    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "pixtral-12b-2409",
        messages,
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Mistral error: ${err}`);
    }

    const mistralData = await resp.json();
    const raw = mistralData.choices?.[0]?.message?.content ?? "{}";

    // Parse JSON — strip markdown fences if present
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(jsonStr);
    } catch {
      extracted = { notes: "Could not parse document" };
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
