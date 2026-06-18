import { ArrowLeft, Home, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { ElectricBorderFrame } from "@/components/ElectricBorderWire";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

function GridBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-5"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern
          id="not-found-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#not-found-grid)" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="bg-background min-h-screen">
      <section className="relative overflow-hidden">
        <GridBackground />

        <ElectricBorderFrame
          className="container mx-auto flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-24"
          bulbCount={6}
        >
          <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
            <div className="border-border bg-card mb-8 flex h-16 w-16 items-center justify-center rounded-lg border shadow-sm">
              <Search className="text-primary h-7 w-7" />
            </div>

            <p className="text-muted-foreground mb-3 text-sm font-medium tracking-[0.2em] uppercase">
              Error 404
            </p>

            <h1 className="text-foreground mb-4 text-5xl font-semibold tracking-tight sm:text-7xl">
              Page{" "}
              <span className="from-primary to-accent bg-linear-to-r bg-clip-text text-transparent">
                not found
              </span>
            </h1>

            <p className="text-muted-foreground mb-10 max-w-md text-lg leading-relaxed">
              This thread got lost in the web. The page you&apos;re looking for
              doesn&apos;t exist or may have been moved.
            </p>

            <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/">
                <Button size="lg" className="h-11 w-full px-8 sm:w-auto">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-background h-11 w-full px-8 sm:w-auto"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Open Dashboard
                </Button>
              </Link>
            </div>

            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground mt-8 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Or go back to the previous page
            </Link>
          </div>

          {/* Decorative 404 watermark */}
          <div
            className="text-foreground/[0.03] pointer-events-none absolute inset-0 flex items-center justify-center select-none"
            aria-hidden
          >
            <span className="text-[clamp(8rem,30vw,18rem)] font-bold tracking-tighter">
              404
            </span>
          </div>
        </ElectricBorderFrame>
      </section>

      <Footer />
    </main>
  );
}
