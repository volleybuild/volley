"use client";

import { Button } from "./ui/button";
import { useReveal } from "@/lib/use-reveal";

export function DownloadCta() {
  const ref = useReveal();

  return (
    <section id="download" className="py-28 px-6" ref={ref}>
      <div className="max-w-2xl mx-auto text-center">
        <div className="reveal">
          <div className="w-8 h-px bg-gradient-to-r from-transparent via-accent-bright/30 to-transparent mx-auto mb-10" />
          <p className="text-vo-text-muted text-sm mb-3">
            Open source and actively developed.
          </p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight mb-3">
            Give it a try.
          </h2>
          <p className="text-vo-text-secondary mb-8">
            Open source. Free.
          </p>
        </div>
        <div className="reveal reveal-delay-1 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" href="https://github.com/volleybuild/volley/releases/latest">Download for Mac</Button>
          <Button variant="ghost" href="https://github.com/volleybuild/volley" target="_blank" rel="noopener noreferrer">View on GitHub</Button>
        </div>
        <p className="reveal reveal-delay-2 mt-4 text-xs text-vo-text-muted">
          macOS &middot; Windows &amp; Linux coming soon
        </p>
      </div>
    </section>
  );
}
