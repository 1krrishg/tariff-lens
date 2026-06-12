import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-5 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-5">
          Ready to simulate your shipment?
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Upload a trade document or enter your shipment details. Get your tariff exposure and a recommendation in 30 seconds — free.
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-medium">
          <Link to="/simulate">
            Simulate now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
