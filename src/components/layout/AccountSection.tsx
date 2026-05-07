"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AccountSection() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <span className="text-sm text-muted-foreground truncate">
          {session?.user?.email ?? "Account"}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
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
    </div>
  );
}
