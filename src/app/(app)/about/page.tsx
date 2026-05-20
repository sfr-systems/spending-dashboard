import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { OwnerPhoto } from "@/components/about/OwnerPhoto";
import { TipJar } from "@/components/about/TipJar";
import { Banknote, Lock, Sparkles } from "lucide-react";

export const metadata = { title: "About — SpendWise" };

export default async function AboutPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">About SpendWise</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A personal spending dashboard built for clarity, not commerce.
        </p>
      </div>

      <section className="grid gap-6 rounded-xl border border-border bg-card p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
        <OwnerPhoto />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Built by
          </p>
          <h2 className="mt-1 text-xl font-semibold">Ryan Snyder</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            I built SpendWise after getting tired of jumping between bank
            statements and spreadsheets just to figure out where my money was
            actually going. It started as a weekend project for me and my
            friends, and turned into a clean, focused way to see your spending
            without ads, upsells, or someone trying to sell you a budgeting
            course.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Why SpendWise exists
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={Sparkles}
            title="Clarity over clutter"
            body="A modern, focused dashboard that surfaces what's actually useful — trends by category, source, and time period — without the noise of typical banking apps."
          />
          <FeatureCard
            icon={Banknote}
            title="Your data, your rules"
            body="Connect a bank via Plaid or import CSVs. Define your own Smart Categories, rename messy descriptions, and exclude noise — all without us ever guessing for you."
          />
          <FeatureCard
            icon={Lock}
            title="Personal, not commercial"
            body="SpendWise is a personal / friends-and-family project. Plaid access is read-only, tokens are encrypted at rest, and your transactions are scoped strictly to your account."
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          What this is, and isn&apos;t
        </h2>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">What it is</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>A read-only view of your spending</li>
              <li>CSV uploads + Plaid bank connections</li>
              <li>User-defined rules, categories, and exports</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">What it isn&apos;t</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>A budgeting or money-movement tool</li>
              <li>A multi-currency or business accounting app</li>
              <li>Anything that shares your data with third parties</li>
            </ul>
          </div>
        </div>
      </section>

      <TipJar />

      <p className="text-xs text-muted-foreground">
        Questions or feedback? Reach out at{" "}
        <a
          href="mailto:1rksnyder@gmail.com"
          className="underline-offset-4 hover:underline"
        >
          1rksnyder@gmail.com
        </a>
        .
      </p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
