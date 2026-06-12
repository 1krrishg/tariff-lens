const stats = [
  { value: "$180B+", label: "US exports hit by retaliatory tariffs in 2024" },
  { value: "38%", label: "Average effective tariff rate on US ag goods to China" },
  { value: "47", label: "Countries with active retaliatory measures on US goods" },
  { value: "30s", label: "Time to simulate your shipment with TariffLens" },
];

export function ImpactCounter() {
  return (
    <section className="py-16 sm:py-20 border-b border-border">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.value}>
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2 tabular-nums">{s.value}</div>
              <div className="text-sm text-muted-foreground leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
