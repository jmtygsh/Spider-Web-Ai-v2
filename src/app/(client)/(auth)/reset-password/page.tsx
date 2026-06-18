"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";

import { authClient } from "@/server/better-auth/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Purpose:
// Form that sets a new password using the token from the reset email link.
function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(
        "Invalid or missing reset token. Please request a new password reset link.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    // Submit the new password together with the one-time reset token.
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (resetError) {
      setError(resetError.message || "Failed to reset password");
      setIsLoading(false);
    } else {
      router.push("/login");
    }
  };

  // Block the form when the link is missing or already expired.
  if (!token || tokenError === "INVALID_TOKEN") {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="rounded-md border border-[var(--status-error)]/20 bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
          {tokenError === "INVALID_TOKEN"
            ? "This reset link is invalid or has expired. Please request a new one."
            : "Invalid or missing reset token. Please request a new password reset link."}
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request New Link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleResetPassword}>
      <div className="grid gap-6">
        {error && (
          <p className="text-destructive text-center text-sm">{error}</p>
        )}
        <div className="grid gap-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="***************"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="***************"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Resetting password..." : "Reset Password"}
        </Button>
      </div>
    </form>
  );
}

// Purpose:
// Wrapper page for the password reset flow with branding and layout.
export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Spider Web
        </Link>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Set New Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Suspense is required because ResetPasswordForm reads search params. */}
              <Suspense
                fallback={
                  <div className="text-muted-foreground text-center text-sm">
                    Loading...
                  </div>
                }
              >
                <ResetPasswordForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
