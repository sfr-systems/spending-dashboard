"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Files, ArrowLeftRight, Settings, ShieldCheck, Info, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionsPopup } from "@/components/transactions/TransactionsPopup";

type NavItem = {
  href: string | null; // null = disabled placeholder
  label: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "Files", icon: Files },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: null, label: "About Us", icon: Info, comingSoon: true },
  { href: "/privacy", label: "Privacy Policy", icon: FileText },
];

interface NavLinksProps {
  onNavigate?: () => void;
  enableContextMenu?: boolean;
}

interface ContextMenuPos {
  x: number;
  y: number;
}

export function NavLinks({ onNavigate, enableContextMenu }: NavLinksProps) {
  const pathname = usePathname();
  const [contextMenu, setContextMenu] = useState<ContextMenuPos | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  // Track client mount so we only call createPortal after document.body exists
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const menuHeight = 60;
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x: e.clientX, y });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openPopup = useCallback(() => {
    setContextMenu(null);
    setPopupOpen(true);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      // Ignore clicks inside the menu itself
      if (menuRef.current?.contains(e.target as Node)) return;
      closeContextMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [contextMenu, closeContextMenu]);

  const renderItem = ({ href, label, icon: Icon, comingSoon }: NavItem) => {
    const isActive = href !== null && (pathname === href || pathname.startsWith(href + "/"));
    const isTransactions = href === "/transactions";

    if (href === null) {
      return (
        <li key={label}>
          <span
            aria-disabled="true"
            className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/50"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {comingSoon && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                Soon
              </span>
            )}
          </span>
        </li>
      );
    }

    return (
      <li key={href}>
        <Link
          href={href}
          onClick={onNavigate}
          onContextMenu={isTransactions && enableContextMenu ? handleContextMenu : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav aria-label="Main navigation">
        <ul className="space-y-1">{primaryNav.map(renderItem)}</ul>
        <hr className="my-3 border-border" aria-hidden="true" />
        <ul className="space-y-1">{secondaryNav.map(renderItem)}</ul>
      </nav>

      {/*
        Portal the context menu to document.body so it escapes the sidebar's
        stacking context and always paints above all page content.
      */}
      {mounted && contextMenu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Transactions options"
            className="fixed z-[9999] w-max min-w-[200px] h-auto rounded-md border border-border bg-popover py-1 shadow-lg"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
              onClick={openPopup}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              Open in current page
            </button>
          </div>,
          document.body
        )
      }

      <TransactionsPopup open={popupOpen} onOpenChange={setPopupOpen} />
    </>
  );
}
