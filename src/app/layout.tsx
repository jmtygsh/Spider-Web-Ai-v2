import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider"
import ConditonRender from "@/components/Conditon";
import { Header } from "@/components/Header";


export const metadata: Metadata = {
  title: "Spider Web an ai native management",
  description:
    "Spider Web an ai native workspace to control your gmails and google calenar with ease just one prompt",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-screen">
        {/* Light/dark theme follows system preference by default. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
            style={{
              backgroundImage: `radial-gradient(var(--color-foreground) 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
            }}
          />
          {/* Header is hidden on auth and connected app routes. */}
          <ConditonRender>
            <Header />
          </ConditonRender>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
