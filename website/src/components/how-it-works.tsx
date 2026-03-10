"use client";

import { STEPS } from "@/lib/constants";
import { SectionHeading } from "./ui/section-heading";
import { useReveal } from "@/lib/use-reveal";

export function HowItWorks() {
  const ref = useReveal();

  return (
    <section id="how-it-works" className="py-20 px-6" ref={ref}>
      <div className="max-w-3xl mx-auto">
        <div className="reveal">
          <SectionHeading title="How it works" />
        </div>

        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className={`reveal reveal-delay-${Math.min(i + 1, 3)} flex items-baseline gap-4`}
            >
              <span className="text-sm tabular-nums text-accent-bright/60 font-mono flex-shrink-0">
                {step.number}.
              </span>
              <div>
                <h3 className="text-sm font-medium text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-vo-text-secondary mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
