"use client";

import { useState } from "react";

export function OwnerPhoto() {
  const [loaded, setLoaded] = useState(true);

  return (
    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:h-40 sm:w-40">
      {loaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/owner.jpg"
          alt="Ryan Snyder, the creator of SpendWise"
          className="h-full w-full object-cover"
          onError={() => setLoaded(false)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 to-primary/10 text-2xl font-semibold text-primary-foreground">
          RS
        </div>
      )}
    </div>
  );
}
