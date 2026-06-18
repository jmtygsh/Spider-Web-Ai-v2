import { redirect } from "next/navigation";

import { resolveWorkspaceContext } from "@/features/identity-workspace";

// Purpose:
// Gate for routes that require a signed-in user.
// Sends visitors to login when there is no active session.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await resolveWorkspaceContext();

  if (!workspace) {
    redirect("/login");
  }

  return <>{children}</>;
}
