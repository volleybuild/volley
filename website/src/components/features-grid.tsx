"use client";

import { FEATURES } from "@/lib/constants";
import { SectionHeading } from "./ui/section-heading";
import { FeatureCard } from "./feature-card";
import { useReveal } from "@/lib/use-reveal";

export function FeaturesGrid() {
  const ref = useReveal();

  return (
    <section id="features" className="py-20 px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <div className="reveal">
          <SectionHeading title="Features" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className={`reveal reveal-delay-${Math.min(i % 3, 3)}`}>
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
