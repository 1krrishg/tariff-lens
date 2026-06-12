import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";

// Seeded tariff data (mirrors src/lib/tariff-data.ts)
const TARIFF_DATA = [
  { hs_code: "1201", product_name: "Soybeans", destination_country: "China", mfn_rate: 3, retaliation_rate: 25, effective_rate: 28, retaliation_note: "China retaliatory tariff on US agricultural goods (2018, maintained 2025)" },
  { hs_code: "2208", product_name: "Bourbon / American Whiskey", destination_country: "China", mfn_rate: 10, retaliation_rate: 25, effective_rate: 35, retaliation_note: "China retaliatory tariff on US spirits" },
  { hs_code: "8803", product_name: "Aircraft parts", destination_country: "China", mfn_rate: 5, retaliation_rate: 25, effective_rate: 30, retaliation_note: "China retaliatory tariff on US manufactured goods" },
  { hs_code: "1005", product_name: "Corn / Maize", destination_country: "China", mfn_rate: 1, retaliation_rate: 25, effective_rate: 26, retaliation_note: "China retaliatory tariff on US agricultural goods" },
  { hs_code: "8542", product_name: "Semiconductors / ICs", destination_country: "China", mfn_rate: 0, retaliation_rate: 25, effective_rate: 25, retaliation_note: "China retaliatory tariff on US tech goods" },
  { hs_code: "0207", product_name: "Poultry / Chicken", destination_country: "China", mfn_rate: 10, retaliation_rate: 25, effective_rate: 35, retaliation_note: "China retaliatory tariff on US food products" },
  { hs_code: "2208", product_name: "Bourbon / American Whiskey", destination_country: "European Union", mfn_rate: 10, retaliation_rate: 25, effective_rate: 35, retaliation_note: "EU retaliatory tariff on US spirits (steel/aluminum dispute)" },
  { hs_code: "0201", product_name: "Beef", destination_country: "European Union", mfn_rate: 12, retaliation_rate: 25, effective_rate: 37, retaliation_note: "EU retaliatory tariff on US agricultural goods" },
  { hs_code: "0402", product_name: "Dairy / Milk powder", destination_country: "European Union", mfn_rate: 7, retaliation_rate: 25, effective_rate: 32, retaliation_note: "EU retaliatory tariff on US dairy" },
  { hs_code: "8542", product_name: "Semiconductors / ICs", destination_country: "European Union", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "No retaliation on semiconductors" },
  { hs_code: "8703", product_name: "Passenger vehicles / Cars", destination_country: "European Union", mfn_rate: 6.5, retaliation_rate: 25, effective_rate: 31.5, retaliation_note: "EU retaliatory tariff on US auto goods" },
  { hs_code: "8703", product_name: "Passenger vehicles / Cars", destination_country: "Canada", mfn_rate: 0, retaliation_rate: 25, effective_rate: 25, retaliation_note: "Canada retaliatory tariff (steel/aluminum dispute)" },
  { hs_code: "0201", product_name: "Beef", destination_country: "Canada", mfn_rate: 0, retaliation_rate: 10, effective_rate: 10, retaliation_note: "Canada retaliatory tariff on US agricultural products" },
  { hs_code: "2208", product_name: "Bourbon / American Whiskey", destination_country: "Canada", mfn_rate: 0, retaliation_rate: 10, effective_rate: 10, retaliation_note: "Canada retaliatory tariff on US spirits" },
  { hs_code: "1201", product_name: "Soybeans", destination_country: "Canada", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "No retaliation — USMCA exemption" },
  { hs_code: "1201", product_name: "Soybeans", destination_country: "Japan", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "No retaliation — US-Japan Trade Agreement" },
  { hs_code: "2208", product_name: "Bourbon / American Whiskey", destination_country: "Japan", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "No retaliation — US-Japan Trade Agreement" },
  { hs_code: "0201", product_name: "Beef", destination_country: "Japan", mfn_rate: 9, retaliation_rate: 0, effective_rate: 9, retaliation_note: "Standard MFN rate only, no retaliation" },
  { hs_code: "8542", product_name: "Semiconductors / ICs", destination_country: "Japan", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "No tariff on semiconductors" },
  { hs_code: "1005", product_name: "Corn / Maize", destination_country: "Mexico", mfn_rate: 0, retaliation_rate: 20, effective_rate: 20, retaliation_note: "Mexico retaliatory tariff on US corn" },
  { hs_code: "0201", product_name: "Beef", destination_country: "Mexico", mfn_rate: 0, retaliation_rate: 20, effective_rate: 20, retaliation_note: "Mexico retaliatory tariff on US agricultural goods" },
  { hs_code: "1201", product_name: "Soybeans", destination_country: "Mexico", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "USMCA — no tariff" },
  { hs_code: "8542", product_name: "Semiconductors / ICs", destination_country: "India", mfn_rate: 0, retaliation_rate: 0, effective_rate: 0, retaliation_note: "No retaliation on semiconductors" },
  { hs_code: "0201", product_name: "Beef", destination_country: "India", mfn_rate: 30, retaliation_rate: 0, effective_rate: 30, retaliation_note: "High MFN rate, no retaliation" },
  { hs_code: "2208", product_name: "Bourbon / American Whiskey", destination_country: "India", mfn_rate: 150, retaliation_rate: 0, effective_rate: 150, retaliation_note: "India baseline tariff on spirits — very high MFN" },
];

// Alternative markets for rerouting suggestions
const ALTERNATIVES: Record<string, string[]> = {
  "China": ["Japan", "Canada", "Mexico"],
  "European Union": ["Canada", "Japan"],
  "Canada": ["Mexico", "Japan"],
  "Mexico": ["Canada", "Japan"],
  "India": ["Japan", "Canada"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hs_code, destination_country, shipment_value, product_name } = await req.json();

    // Look up tariff
    const entry = TARIFF_DATA.find(
      t => t.hs_code === hs_code && t.destination_country === destination_country
    );

    // If no exact match, use a generic rate based on destination
    const mfn_rate = entry?.mfn_rate ?? 5;
    const retaliation_rate = entry?.retaliation_rate ?? 0;
    const effective_rate = entry?.effective_rate ?? mfn_rate;
    const retaliation_note = entry?.retaliation_note ?? "No specific retaliatory measure found for this product/destination combination.";
    const resolved_product = entry?.product_name ?? product_name ?? "Goods";

    const tariff_cost_today = Math.round(shipment_value * (effective_rate / 100));

    // Build alternative market scenarios
    const altMarkets = (ALTERNATIVES[destination_country] ?? ["Japan"]).slice(0, 2);
    const altScenarios = altMarkets.map(alt => {
      const altEntry = TARIFF_DATA.find(t => t.hs_code === hs_code && t.destination_country === alt);
      const altRate = altEntry?.effective_rate ?? (altEntry?.mfn_rate ?? 3);
      return { country: alt, rate: altRate, cost: Math.round(shipment_value * (altRate / 100)) };
    });

    const escalatedRate = Math.min(effective_rate + 5, effective_rate + retaliation_rate * 0.2);
    const escalatedCost = Math.round(shipment_value * (escalatedRate / 100));

    const scenarios = [
      {
        name: "Today",
        description: `Current effective rate at ${destination_country}: ${mfn_rate}% MFN${retaliation_rate > 0 ? ` + ${retaliation_rate}% retaliatory` : ""}.`,
        tariff_rate: effective_rate,
        tariff_cost: tariff_cost_today,
        net_proceeds: shipment_value - tariff_cost_today,
        severity: effective_rate >= 25 ? "high" : effective_rate >= 10 ? "medium" : effective_rate > 0 ? "low" : "none",
      },
      {
        name: "Escalation scenario",
        description: `If trade tensions escalate and retaliation increases by ~20%, effective rate rises to ${escalatedRate.toFixed(1)}%. This could happen if US-${destination_country} negotiations break down.`,
        tariff_rate: parseFloat(escalatedRate.toFixed(1)),
        tariff_cost: escalatedCost,
        net_proceeds: shipment_value - escalatedCost,
        severity: escalatedRate >= 25 ? "high" : "medium",
      },
      {
        name: `Reroute to ${altScenarios[0]?.country ?? "Japan"}`,
        description: `${altScenarios[0]?.country ?? "Japan"} currently has ${altScenarios[0]?.rate ?? 0}% effective rate on this product. ${altScenarios[0]?.rate === 0 ? "No retaliatory tariff in place." : "Lower exposure than primary destination."}`,
        tariff_rate: altScenarios[0]?.rate ?? 0,
        tariff_cost: altScenarios[0]?.cost ?? 0,
        net_proceeds: shipment_value - (altScenarios[0]?.cost ?? 0),
        severity: (altScenarios[0]?.rate ?? 0) === 0 ? "none" : (altScenarios[0]?.rate ?? 0) < effective_rate ? "low" : "medium",
      },
    ] as const;

    // Build context for Groq
    const context = `
Product: ${resolved_product} (HS ${hs_code})
Destination: ${destination_country}
Shipment value: $${shipment_value.toLocaleString()}
MFN (baseline) duty: ${mfn_rate}%
Retaliatory tariff: ${retaliation_rate > 0 ? `${retaliation_rate}% (${retaliation_note})` : "None"}
Effective rate today: ${effective_rate}%
Tariff cost today: $${tariff_cost_today.toLocaleString()}

Scenario 1 — Today: ${effective_rate}% → -$${tariff_cost_today.toLocaleString()}
Scenario 2 — Escalation: ${escalatedRate.toFixed(1)}% → -$${escalatedCost.toLocaleString()}
Scenario 3 — Reroute to ${altScenarios[0]?.country}: ${altScenarios[0]?.rate}% → -$${altScenarios[0]?.cost.toLocaleString()}
${altScenarios[1] ? `Also considered: ${altScenarios[1].country} at ${altScenarios[1].rate}%` : ""}
`.trim();

    const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            content: `You are a US export trade advisor specializing in tariff risk. You give concise, actionable analysis to US exporters facing retaliatory tariffs abroad. Be specific, use dollar amounts, and always end with one clear action. No fluff. Max 150 words per section.`,
          },
          {
            role: "user",
            content: `Based on this shipment data, write two things:

1. RISK SUMMARY (2-3 sentences): Explain the tariff situation in plain English — what the effective rate is, why the retaliatory tariff exists, and the dollar cost on this shipment.

2. RECOMMENDATION (1-2 sentences): One specific action the exporter should take. Be direct — name the action (reroute, hedge, accelerate, diversify) and quantify the benefit in dollars if possible.

Shipment data:
${context}

Return as JSON: {"risk_summary": "...", "recommendation": "..."}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!groqResp.ok) {
      const errText = await groqResp.text();
      throw new Error(`Groq error: ${errText}`);
    }

    const groqData = await groqResp.json();
    const rawContent = groqData.choices?.[0]?.message?.content ?? "{}";
    const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let aiOutput = { risk_summary: "", recommendation: "" };
    try {
      aiOutput = JSON.parse(jsonStr);
    } catch {
      // fallback parse: try to extract from text
      const summaryMatch = rawContent.match(/"risk_summary"\s*:\s*"([^"]+)"/);
      const recMatch = rawContent.match(/"recommendation"\s*:\s*"([^"]+)"/);
      aiOutput = {
        risk_summary: summaryMatch?.[1] ?? rawContent.substring(0, 300),
        recommendation: recMatch?.[1] ?? "Consult a trade advisor for specific routing options.",
      };
    }

    const result = {
      hs_code,
      product_name: resolved_product,
      destination_country,
      shipment_value,
      mfn_rate,
      retaliation_rate,
      effective_rate,
      retaliation_note,
      tariff_cost_today,
      scenarios,
      risk_summary: aiOutput.risk_summary,
      recommendation: aiOutput.recommendation,
      data_source: "TariffLens seed data · US Dept of Commerce Foreign Retaliations Database reference",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
