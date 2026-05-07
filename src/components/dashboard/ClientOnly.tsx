"use client";

import { useState, useEffect, ReactNode } from "react";

// Prevents Recharts (which uses ResizeObserver) from rendering during SSR,
// where the container has no measurable width and bars appear invisible.
export function ClientOnly({ children, fallbackHeight = "h-64" }: { children: ReactNode; fallbackHeight?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className={fallbackHeight} />;
  return <>{children}</>;
}
