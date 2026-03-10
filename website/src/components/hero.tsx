"use client";

import { Button } from "./ui/button";

export function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
      {/* Subtle top-down gradient fade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(110,231,183,0.03) 0%, transparent 40%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-14">
        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.1]">
          Run{" "}
          <span className="bg-gradient-to-r from-accent-bright to-accent bg-clip-text text-transparent">
            parallel
          </span>{" "}
          AI coding sessions
        </h1>
        <p className="mt-5 text-lg text-vo-text-secondary max-w-xl mx-auto leading-relaxed">
          An open-source desktop app for running multiple AI sessions at once.
          Built-in git, grid view, and project management.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" href="https://github.com/volleybuild/volley/releases/latest">Download for Mac</Button>
          <Button variant="ghost" href="https://github.com/volleybuild/volley" target="_blank" rel="noopener noreferrer">View on GitHub</Button>
        </div>
        <p className="mt-4 text-xs text-vo-text-muted">
          macOS &middot; Windows &amp; Linux coming soon
        </p>
      </div>

      {/* Showcase area */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">{children}</div>
    </section>
  );
}
