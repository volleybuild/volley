import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { TerminalShowcase } from "@/components/showcase/terminal-showcase";
import { FeaturesGrid } from "@/components/features-grid";
import { HowItWorks } from "@/components/how-it-works";
import { DeepDiveSection } from "@/components/deep-dive-section";
import { DeepDiveNotes } from "@/components/deep-dive-notes";
import { DeepDiveTodos } from "@/components/deep-dive-todos";
import { DeepDiveSessions } from "@/components/deep-dive-sessions";
import { DeepDiveGrid } from "@/components/deep-dive-grid";
import { DeepDiveGit } from "@/components/deep-dive-git";
import { ComingSoon } from "@/components/coming-soon";
import { DownloadCta } from "@/components/download-cta";
import { Footer } from "@/components/footer";

function Divider() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero>
          <TerminalShowcase />
        </Hero>

        <Divider />
        <FeaturesGrid />

        <Divider />
        <HowItWorks />

        <Divider />
        <DeepDiveSection
          title="Notes"
          description="Capture ideas in freeform notes. Organize them in folders and by type to keep large projects structured. When you're ready, generate todos directly from a note."
          animation={<DeepDiveNotes />}
        />

        <DeepDiveSection
          title="Todos"
          description="Plan work as todos, then start sessions directly from the list — each one gets its own branch automatically. Prioritize, reorder, and track what's next."
          animation={<DeepDiveTodos />}
          reversed
        />

        <DeepDiveSection
          title="Session lifecycle"
          description="Sessions move through todo, in progress, and completed. The sidebar shows everything at a glance — with search to find anything fast."
          animation={<DeepDiveSessions />}
        />

        <DeepDiveSection
          title="Grid view"
          description="All sessions visible at once. Each pane shows what the agent is doing — reading files, writing code, running commands."
          animation={<DeepDiveGrid />}
          reversed
        />

        <DeepDiveSection
          title="Built-in git"
          description="Commit, push, and manage branches from a dropdown — no terminal needed. Each session tracks its own branch with live diff stats."
          animation={<DeepDiveGit />}
        />

        <Divider />
        <ComingSoon />

        <DownloadCta />
      </main>
      <Footer />
    </>
  );
}
