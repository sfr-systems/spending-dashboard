"use client";

import { useRef, useState } from "react";
import { Heart, ImagePlus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status =
  | { kind: "idle" }
  | { kind: "selected"; file: File; previewUrl: string }
  | { kind: "sending"; file: File; previewUrl: string }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const MAX_BYTES = 4 * 1024 * 1024;

export function TipJar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "Please pick an image file." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ kind: "error", message: "That image is over 4 MB." });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setStatus({ kind: "selected", file, previewUrl });
  }

  function reset() {
    if (status.kind === "selected" || status.kind === "sending") {
      URL.revokeObjectURL(status.previewUrl);
    }
    setStatus({ kind: "idle" });
  }

  async function send() {
    if (status.kind !== "selected") return;
    const { file, previewUrl } = status;
    setStatus({ kind: "sending", file, previewUrl });
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/about/send-photo", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Send failed (${res.status})`);
      }
      URL.revokeObjectURL(previewUrl);
      setStatus({ kind: "sent" });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Send failed",
      });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-pink-500" aria-hidden="true" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Enjoying SpendWise?
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Loving the site and want to thank the owner? Just send Ryan a nude!
        Tips are accepted in JPEG, PNG, or HEIC. (Just kidding... Unless you
        want to.)
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        Your photo is forwarded to the owner&apos;s email and never stored on the server.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {status.kind === "idle" && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={pickFile} className="gap-2">
            <ImagePlus className="h-3.5 w-3.5" />
            Upload Nude
          </Button>
        </div>
      )}

      {(status.kind === "selected" || status.kind === "sending") && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={status.previewUrl}
            alt="Preview"
            className="h-24 w-24 rounded-md object-cover border border-border"
          />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-medium">{status.file.name}</span>
            <span className="text-muted-foreground">
              {(status.file.size / 1024).toFixed(0)} KB
            </span>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={send}
                disabled={status.kind === "sending"}
                className="gap-1.5"
              >
                {status.kind === "sending" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={status.kind === "sending"}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {status.kind === "sent" && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          <Heart className="h-4 w-4" />
          Thanks! Your photo is on its way.
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs underline-offset-4 hover:underline"
          >
            Send another
          </button>
        </div>
      )}

      {status.kind === "error" && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {status.message}
          <button
            type="button"
            onClick={reset}
            className="ml-3 text-xs underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
