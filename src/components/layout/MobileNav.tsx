"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex md:hidden items-center h-14 border-b border-border bg-background px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full px-4 py-6">
            <SheetHeader className="mb-6 px-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                SpendWise
              </SheetTitle>
            </SheetHeader>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto px-3 pt-4">
              <Link
                href="/privacy"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Privacy policy
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 ml-3">
        <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold tracking-tight">SpendWise</span>
      </div>

      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
