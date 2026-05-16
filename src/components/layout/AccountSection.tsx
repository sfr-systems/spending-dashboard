"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useState, useEffect, useRef } from "react";

function resizeToDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      // Center-crop to square then scale
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function AccountSection() {
  const { data: session } = useSession();
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/api/profile/avatar")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.avatarDataUrl) setAvatarDataUrl(data.avatarDataUrl); })
      .catch(() => {});
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !avatarBtnRef.current?.contains(e.target as Node)
      ) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    setUploading(true);
    setMenuOpen(false);
    try {
      const dataUrl = await resizeToDataUrl(file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarDataUrl: dataUrl }),
      });
      if (res.ok) setAvatarDataUrl(dataUrl);
    } catch {
      // silently ignore upload errors
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setMenuOpen(false);
    await fetch("/api/profile/avatar", { method: "DELETE" });
    setAvatarDataUrl(null);
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Row 1 — avatar + email */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Avatar button */}
        <div className="relative shrink-0">
          <button
            ref={avatarBtnRef}
            onClick={() => setMenuOpen((o) => !o)}
            disabled={uploading}
            aria-label="Profile picture options"
            className="group relative flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            {/* Hover overlay */}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-3 w-3 text-white" aria-hidden />
            </span>
          </button>

          {/* Context menu */}
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-lg border border-border bg-card py-1 shadow-xl"
            >
              <button
                onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                {avatarDataUrl ? "Change photo" : "Upload photo"}
              </button>
              {avatarDataUrl && (
                <button
                  onClick={handleRemove}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove photo
                </button>
              )}
            </div>
          )}
        </div>

        <span className="text-sm text-muted-foreground truncate">
          {session?.user?.email ?? "Account"}
        </span>
      </div>

      {/* Row 2 — icon buttons */}
      <div className="flex items-center justify-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
          className="h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
