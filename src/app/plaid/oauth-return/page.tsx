"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";

export default function PlaidOAuthReturnPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Resuming bank connection…");

  useEffect(() => {
    const stored = sessionStorage.getItem("plaid:link_token");
    if (!stored) {
      setError(
        "Missing link token. Please return to Files and start the bank connection again."
      );
      return;
    }
    setToken(stored);
  }, []);

  const finish = useCallback(
    async (publicToken: string) => {
      setStatus("Finalizing connection…");
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ publicToken }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to connect bank");
        }
        const data = await res.json();
        setStatus("Pulling first batch of transactions…");
        await fetch("/api/plaid/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId: data.id }),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to connect bank");
        return;
      } finally {
        sessionStorage.removeItem("plaid:link_token");
      }
      router.replace("/files");
    },
    [router]
  );

  const { open, ready } = usePlaidLink({
    token,
    receivedRedirectUri: typeof window !== "undefined" ? window.location.href : undefined,
    onSuccess: (publicToken) => {
      void finish(publicToken);
    },
    onExit: () => {
      sessionStorage.removeItem("plaid:link_token");
      router.replace("/files");
    },
  });

  useEffect(() => {
    if (token && ready) {
      open();
    }
  }, [token, ready, open]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      {error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/files")}
            className="text-sm underline underline-offset-4"
          >
            Back to Files
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
