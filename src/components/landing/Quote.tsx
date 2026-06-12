export function Quote() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 border-b border-border bg-secondary/40">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-3xl">
          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground leading-snug mb-6">
            "We didn't know China had a 25% retaliatory tariff on our soybeans until we were already committed to the shipment. That cost us $140,000 in margin."
          </blockquote>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Midwest soybean exporter</span> · $12M annual export volume
          </div>
        </div>
      </div>
    </section>
  );
}
