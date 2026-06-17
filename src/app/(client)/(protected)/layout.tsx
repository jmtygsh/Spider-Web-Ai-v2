import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";

// Purpose:
// Gate for routes that require a signed-in user.
// Sends visitors to login when there is no active session.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
