import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource-variable/outfit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Volley — Parallel AI coding sessions",
  description:
    "Run multiple AI coding sessions simultaneously with built-in git. Ship faster with Volley.",
  metadataBase: new URL("https://volley.build"),
  openGraph: {
    title: "Volley — Parallel AI coding sessions",
    description:
      "Run multiple AI coding sessions simultaneously with built-in git. Ship faster with Volley.",
    url: "https://volley.build",
    siteName: "Volley",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans grain">{children}</body>
    </html>
  );
}
