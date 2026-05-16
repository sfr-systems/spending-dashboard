import { TrendingUp } from "lucide-react";
import { NavLinks } from "./NavLinks";
import { AccountSection } from "./AccountSection";

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border" style={{ backgroundColor: "hsl(var(--sidebar, var(--background)))" }}>
      <div className="flex flex-col flex-1 min-h-0 px-4 py-6">
        {/* Logo / App name */}
        <div className="flex items-center gap-2 mb-8 px-3">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight">
            SpendWise
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1">
          <NavLinks enableContextMenu />
        </div>

        {/* Account + logout */}
        <div className="mt-auto pt-4 border-t border-border">
          <AccountSection />
        </div>
      </div>
    </aside>
  );
}
