"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      mfaCode: mfaCode.trim(),
      redirect: false,
    });

    setLoading(false);

    if (result?.error === "MFA_REQUIRED") {
      setMfaRequired(true);
      setError("");
      return;
    }
    if (result?.error === "MFA_INVALID") {
      setMfaRequired(true);
      setError("That code didn't work. Try again, or use a backup code.");
      setMfaCode("");
      return;
    }
    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {mfaRequired
            ? "Enter the 6-digit code from your authenticator app, or a backup code."
            : "Enter your email and password to access your account."}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={mfaRequired}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={mfaRequired}
            />
          </div>

          {mfaRequired && (
            <div className="space-y-1.5">
              <Label htmlFor="mfaCode">Authentication code</Label>
              <Input
                id="mfaCode"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456 or backup code"
              />
              <p className="text-xs text-muted-foreground">
                6-digit code from your authenticator app, or a one-time backup code.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Signing in…"
              : mfaRequired
              ? "Verify and sign in"
              : "Sign in"}
          </Button>
          {mfaRequired ? (
            <button
              type="button"
              onClick={() => {
                setMfaRequired(false);
                setMfaCode("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Use a different account
            </button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center">
            <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
              Privacy policy
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
