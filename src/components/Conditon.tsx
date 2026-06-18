"use client";

import React from "react";
import { usePathname } from "next/navigation";

// Purpose:
// Hides public layout chrome on authenticated or auth routes.
// Runs in root layout; returns null on dashboard, connect, mails, calendar, login, register.
// Input: layout children; expected result: children on public routes, null on hidden routes.
export default function ConditonRender({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide the public header on the dashboard or other protected routes
  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/connect") ||
    pathname?.startsWith("/mails") ||
    pathname?.startsWith("/calendar") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password")
  ) {
    return null;
  }

  return <>{children}</>;
}
