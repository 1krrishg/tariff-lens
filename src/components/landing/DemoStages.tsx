import { Upload, Search, BarChart3, Lightbulb, ArrowDown } from "lucide-react";

export function DemoStages() {
  return (
    <section id="how" className="relative py-16 sm:py-20 md:py-28 border-b border-border bg-secondary/40">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-10 sm:mb-14">
          <div className="text-xs font-medium uppercase tracking-wider text-primary mb-3">How it works</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
            Upload a doc. Get a decision in 30 seconds.
          </h2>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <Stage icon={<Upload className="h-4 w-4 text-primary" />} num="01" title="Upload your trade document" desc="Invoice, packing list, or any export doc. Mistral AI reads it and extracts the product, HS code, destination, and shipment value — no form filling required." />
          <Arrow />
          <Stage icon={<Search className="h-4 w-4 text-primary" />} num="02" title="Tariff lookup" desc="TariffLens looks up the current effective tariff rate — MFN baseline duty plus any retaliatory tariff your destination country has applied to US-origin goods." />
          <Arrow />
          <Stage icon={<BarChart3 className="h-4 w-4 text-primary" />} num="03" title="Scenario simulation" desc="See the dollar impact under 3 realistic scenarios: today's rate, an escalation scenario, and an alternative market with no retaliation." />
          <Arrow />
          <Stage icon={<Lightbulb className="h-4 w-4 text-primary" />} num="04" title="AI recommendation" desc="Groq-powered analysis gives you a plain-English risk summary and one specific action — reroute, hedge, accelerate shipment, or stay the course." />
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center">
      <ArrowDown className="h-5 w-5 text-muted-foreground/40" />
    </div>
  );
}

function Stage({ icon, num, title, desc }: { icon: React.ReactNode; num: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 flex gap-4 items-start">
      <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-primary-soft border border-primary/20 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-0.5">{num}</div>
        <div className="font-semibold text-foreground text-sm mb-1">{title}</div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
