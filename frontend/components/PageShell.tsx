"use client";

import { Navbar } from "@/components/Navbar";

/** Shared chrome for every room of the house: navbar, page header, footer. */
export function PageShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title?: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {(eyebrow || title) && (
            <header className="pt-4 animate-fade-in">
              {eyebrow && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent/50" />
                  <span className="text-xs font-mono text-accent/70 tracking-widest uppercase">
                    {eyebrow}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
                </div>
              )}
              {title && (
                <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
              )}
              {lede && (
                <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                  {lede}
                </p>
              )}
            </header>
          )}
          {children}
        </div>
      </main>

      <footer className="border-t border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-xs text-muted-foreground font-mono">
              Kredo · Reputation-based Lending on GenLayer ·{" "}
              <a
                href={`https://explorer-studio.genlayer.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                Verify on explorer ↗
              </a>
            </span>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                GenLayer
              </a>
              <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                Studio
              </a>
              <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                Docs
              </a>
              <a href="https://github.com/genlayerlabs/genlayer-project-boilerplate" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
