export function Quote() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 border-b border-border bg-secondary/40">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-3xl">
          <div className="text-xs font-medium uppercase tracking-wider text-primary mb-4">
            The real problem
          </div>
          <p className="text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]">
            The truck doesn't get held at Raxaul because the goods are wrong.
            <span className="block text-muted-foreground mt-2">It gets held because the paperwork is.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
