"use client";

import Link from "next/link";

import { LogInIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/server/better-auth/client";
import { getDisplayName } from "@/utils/helper";

// Purpose:
// Public site header — brand, nav links, theme toggle, and auth actions.
// Runs on public pages via root layout when ConditonRender allows chrome.
// Expected result: top nav with login/logout and theme switcher.
export function Header() {
  const { data: session } = useSession();
  const { setTheme } = useTheme();

  const displayName = getDisplayName(session?.user?.name);

  return (
    <header className="border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full overflow-hidden border-b backdrop-blur">
      <div className="relative container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-baseline gap-1 cursor-pointer">

            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="2" fill="#ec4899" />

              <line
                x1="12"
                y1="3"
                x2="12"
                y2="21"
                stroke="#ec4899"
                strokeWidth="1.5"
              />

              <line
                x1="3"
                y1="12"
                x2="21"
                y2="12"
                stroke="currentColor"
                strokeWidth="1.5"
              />

              <line
                x1="5"
                y1="5"
                x2="19"
                y2="19"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>

            <span className="text-xl font-bold tracking-tight">Spider Web</span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">


          <Link
            href="/pricing"
            className="text-foreground hover:text-foreground/80 hidden text-sm font-medium transition-colors sm:block"
          >
            Pricing
          </Link>

          <Link
            href={session ? "/dashboard" : "/login"}
            className="text-foreground hover:text-foreground/80 hidden text-sm font-medium transition-colors sm:block"
          >
            {session ? "Dashboard" : "Login"}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-3 rounded-none shadow-sm">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <SunIcon />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <MoonIcon />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <MonitorIcon />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 px-6 font-medium shadow-none">
                  {displayName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="mt-3 rounded-none shadow-sm"
              >
                <DropdownMenuItem
                  className="text-sidebar-accent-foreground text-base-sm cursor-pointer"
                  onClick={async () => {
                    await authClient.signOut();
                  }}
                >
                  <LogOutIcon />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (

            <Link href="/dashboard" className="cursor-pointer">
              <Button className="h-9 px-6 font-medium shadow-none cursor-pointer">
                <LogInIcon />
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
