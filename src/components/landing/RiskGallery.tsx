import { AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";

const examples = [
  { product: "Soybeans", hs: "1201", dest: "China", mfn: 3, retaliation: 25, effective: 28, severity: "high" },
  { product: "Bourbon", hs: "2208", dest: "EU", mfn: 10, retaliation: 25, effective: 35, severity: "high" },
  { product: "Beef", hs: "0201", dest: "EU", mfn: 12, retaliation: 25, effective: 37, severity: "high" },
  { product: "Corn", hs: "1005", dest: "Mexico", mfn: 0, retaliation: 20, effective: 20, severity: "medium" },
  { product: "Passenger Cars", hs: "8703", dest: "Canada", mfn: 0, retaliation: 25, effective: 25, severity: "high" },
  { product: "Semiconductors", hs: "8542", dest: "Japan", mfn: 0, retaliation: 0, effective: 0, severity: "none" },
  { product: "Soybeans", hs: "1201", dest: "Japan", mfn: 0, retaliation: 0, effective: 0, severity: "none" },
  { product: "Bourbon", hs: "2208", dest: "China", mfn: 10, retaliation: 25, effective: 35, severity: "high" },
];

export function RiskGallery() {
  return (
    <section id="scenarios" className="py-16 sm:py-20 md:py-28 border-b border-border">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-xs font-medium uppercase tracking-wider text-primary mb-3">Tariff exposure map</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">
            See what US exporters face right now.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {examples.map((e) => (
            <div key={`${e.hs}-${e.dest}`} className={`rounded-xl border p-4 ${e.severity === "high" ? "border-destructive/30 bg-destructive-soft" : e.severity === "medium" ? "border-warning/30 bg-warning-soft" : "border-success/30 bg-success-soft"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono text-muted-foreground">HS {e.hs}</div>
                {e.severity === "none"
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  : e.severity === "high"
                  ? <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
              </div>
              <div className="font-semibold text-sm text-foreground mb-0.5">{e.product}</div>
              <div className="text-xs text-muted-foreground mb-3">→ {e.dest}</div>
              <div className="flex gap-3 text-[11px]">
                <div>
                  <div className="text-muted-foreground">MFN</div>
                  <div className="font-mono font-medium text-foreground">{e.mfn}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Retaliation</div>
                  <div className={`font-mono font-medium ${e.retaliation > 0 ? "text-destructive" : "text-success"}`}>{e.retaliation > 0 ? `+${e.retaliation}%` : "None"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Effective</div>
                  <div className={`font-mono font-semibold ${e.effective >= 20 ? "text-destructive" : e.effective > 0 ? "text-warning" : "text-success"}`}>{e.effective}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
