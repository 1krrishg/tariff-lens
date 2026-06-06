import { AlertCircle, AlertTriangle } from "lucide-react";

/**
 * RiskGallery — a wall of real example flags.
 * No paragraphs. Just realistic alerts the way they appear in the product.
 */

const examples = [
  { sev: "high", title: "Weight mismatch", detail: "Packing list 7,540 kg · Invoice 7,200 kg" },
  { sev: "high", title: "LC value exceeded", detail: "Invoice ₹ 6,91,080 · LC limit ₹ 6,50,000" },
  { sev: "high", title: "E-way bill expired at border", detail: "Valid till 24 Nov · Truck arrived 26 Nov" },
  { sev: "med", title: "Notify party IEC missing", detail: "Shree Chemicals — no EXIM code in LC" },
  { sev: "med", title: "GSTIN check digit invalid", detail: "19AABCR4892M1ZK — failed Mod-36" },
  { sev: "med", title: "HSN mismatch across docs", detail: "Invoice 2811.22 · Packing list 2811.29" },
  { sev: "med", title: "LUT ARN not on invoice", detail: "Zero-rated export — ARN mandatory" },
  { sev: "med", title: "Consignee set to importer", detail: "LC present — must be To The Order Of bank" },
  { sev: "high", title: "Round-figure under-invoicing", detail: "₹ 6,00,000 exact — pattern flagged" },
] as const;

export function RiskGallery() {
  return (
    <section id="risks" className="relative py-16 sm:py-20 md:py-28 border-b border-border">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-8 sm:mb-12">
          <div className="text-xs font-medium uppercase tracking-wider text-primary mb-3">
            What gets flagged
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1] mb-3">
            The errors that get trucks held at the border.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            40+ checks run on every India-Nepal, India-Bhutan, and India-Bangladesh shipment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {examples.map((e) => (
            <RiskCard key={e.title} {...e} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskCard({ sev, title, detail }: { sev: "high" | "med"; title: string; detail: string }) {
  const map = {
    high: { Icon: AlertCircle, border: "border-destructive/30", bg: "bg-destructive-soft", color: "text-destructive", label: "High" },
    med: { Icon: AlertTriangle, border: "border-warning/30", bg: "bg-warning-soft", color: "text-warning", label: "Med" },
  } as const;
  const { Icon, border, bg, color, label } = map[sev];
  return (
    <div className={`rounded-lg border ${border} bg-card overflow-hidden`}>
      <div className={`px-3 py-1.5 ${bg} border-b ${border} flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className={`text-[10px] uppercase font-medium tracking-wider ${color}`}>{label}</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">SH-2847</span>
      </div>
      <div className="p-3 sm:p-4">
        <div className="text-sm font-medium text-foreground mb-1 leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground font-mono leading-snug break-words">{detail}</div>
      </div>
    </div>
  );
}
