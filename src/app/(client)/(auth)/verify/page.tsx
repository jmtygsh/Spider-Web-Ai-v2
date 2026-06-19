"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";

import { authClient } from "@/server/better-auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Purpose:
// Post-signup screen where users can resend their verification email.
// Reads the email address from the URL when the signup flow passes it in.
function VerifyContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    setError("");
    setMessage("");
    setIsLoading(true);

    // Send another verification link; success sends the user to the dashboard.
    const { error: resendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/dashboard`,
    });

    if (resendError) {
      setError(resendError.message ?? "Failed to resend verification email");
    } else {
      setMessage("Verification email sent. Check your inbox.");
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          If this is a new account, check your inbox for a verification link.
          Already signed up before? Use resend below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 text-center">
        <p className="text-muted-foreground text-sm">
          Please verify your email address to continue setting up your account.
          If you don&apos;t see it, check your spam folder.
        </p>

        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600">
            {message}
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="grid gap-2 text-left">
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
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={isLoading || !email}
        >
          {isLoading ? "Sending..." : "Resend verification email"}
        </Button>

        <Button asChild className="w-full">
          <Link href="/login">Back to Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Purpose:
// Wrapper page for email verification with branding and layout.
export default function VerifyPage() {
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
        {/* Suspense is required because VerifyContent reads search params. */}
        <Suspense
          fallback={
            <div className="text-muted-foreground text-center text-sm">
              Loading...
            </div>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
