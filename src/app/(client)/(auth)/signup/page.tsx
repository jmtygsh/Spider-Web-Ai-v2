"use client";

import { SignUpForm } from "@/components/Signup-form";

// Purpose:
// Registration page for new accounts.
// Centers the sign-up form on a full-height layout.
export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignUpForm />
      </div>
    </div>
  );
}
