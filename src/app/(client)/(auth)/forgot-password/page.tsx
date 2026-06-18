"use client";

import { useState } from "react";
import Link from "next/link";
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
// Lets users request a password reset link by email.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    // Ask the auth service to email a reset link for this address.
    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message ?? "Failed to send password reset email");
    } else {
      setSuccess(true);
    }

    setIsLoading(false);
  };

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
              <CardTitle className="text-xl">Forgot Password</CardTitle>
              <CardDescription>
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="flex flex-col gap-4 text-center">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600">
                    If an account exists with this email, you will receive a
                    password reset link shortly.
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login">Back to Login</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="grid gap-6">
                    {error && (
                      <p className="text-destructive text-center text-sm">
                        {error}
                      </p>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending link..." : "Send Reset Link"}
                    </Button>
                    <div className="text-center text-sm">
                      Remember your password?{" "}
                      <Link
                        href="/login"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Login
                      </Link>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
