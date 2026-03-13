"use client";

import { SectionHeading } from "./ui/section-heading";
import { useReveal } from "@/lib/use-reveal";

const ROADMAP_ITEMS = [
  {
    title: "More AI models",
    description: "Support for OpenAI, Gemini, and other providers.",
  },
  {
    title: "Automatic PRs",
    description: "Open pull requests directly from sessions. GitHub, Azure DevOps, GitLab.",
  },
  {
    title: "Ticket import",
    description: "Pull tasks from Linear, Jira, or Azure DevOps and turn them into sessions.",
  },
  {
    title: "Windows & Linux",
    description: "Native builds for all platforms.",
  },
  {
    title: "Custom themes",
    description: "Choose from built-in themes or create your own color schemes.",
  },
];

export function ComingSoon() {
  const ref = useReveal();

  return (
    <section className="py-20 px-6" ref={ref}>
      <div className="max-w-3xl mx-auto">
        <div className="reveal">
          <SectionHeading title="Coming soon" />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {ROADMAP_ITEMS.map((item, i) => (
            <div
              key={item.title}
              className={`reveal reveal-delay-${Math.min(i % 2 + 1, 3)} w-full sm:w-[calc(50%-0.375rem)] flex items-start gap-3 p-4 rounded-lg border border-dashed border-white/[0.06]`}
            >
              <span className="mt-[7px] w-1 h-1 rounded-full bg-accent-bright/40 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-vo-text-secondary mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="reveal reveal-delay-3 text-center text-sm text-vo-text-muted mt-6">
          And more.
        </p>
      </div>
    </section>
  );
}
