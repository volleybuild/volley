import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { TerminalShowcase } from "@/components/showcase/terminal-showcase";
import { FeaturesGrid } from "@/components/features-grid";
import { HowItWorks } from "@/components/how-it-works";
import { DeepDiveSection } from "@/components/deep-dive-section";
import { DeepDiveGrid } from "@/components/deep-dive-grid";
import { DeepDiveGit } from "@/components/deep-dive-git";
import { DeepDiveSessions } from "@/components/deep-dive-sessions";
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
          title="Grid view"
          description="All sessions visible at once. Each pane shows what the agent is doing — reading files, writing code, running commands."
          animation={<DeepDiveGrid />}
        />

        <DeepDiveSection
          title="Built-in git"
          description="Commit and push from inside the app. Each session tracks its own branch with live diff stats."
          animation={<DeepDiveGit />}
          reversed
        />

        <DeepDiveSection
          title="Session management"
          description="Sessions move through todo, in progress, and completed. The sidebar shows what's running, what's done, and what's next."
          animation={<DeepDiveSessions />}
        />

        <Divider />
        <ComingSoon />

        <DownloadCta />
      </main>
      <Footer />
    </>
  );
}
