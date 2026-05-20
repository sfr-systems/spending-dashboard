import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { OwnerPhoto } from "@/components/about/OwnerPhoto";
import { TipJar } from "@/components/about/TipJar";
import { StarBackground } from "@/components/dashboard/StarBackground";
import { ClientOnly } from "@/components/dashboard/ClientOnly";
import { WaveDivider } from "@/components/dashboard/WaveDivider";
import { Banknote, Lock, Mail, Sparkles, Wand2 } from "lucide-react";

export const metadata = { title: "About — SpendWise" };

const TECH_STACK = [
  "Next.js",
  "TypeScript",
  "Tailwind",
  "Prisma",
  "PostgreSQL",
  "Plaid",
  "Recharts",
];

export default async function AboutPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="relative isolate flex flex-col gap-10">
      <StarBackground />

      {/* Hero header */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-pink-500/10 p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" /> About
          </p>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-200 via-violet-200 to-pink-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
            SpendWise
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A personal spending dashboard built for clarity, not commerce.
            No ads, no upsells, no one trying to sell you a budgeting course.
          </p>
        </div>
      </header>

      {/* Owner card */}
      <section className="grid gap-8 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-8">
        <div className="relative mx-auto sm:mx-0">
          <div
            aria-hidden="true"
            className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 opacity-40 blur-sm"
          />
          <div className="relative rounded-full bg-background p-0.5">
            <OwnerPhoto />
          </div>
        </div>
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <Wand2 className="h-3 w-3" /> Built by
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Ryan Snyder
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            I built SpendWise after getting tired of jumping between bank
            statements and spreadsheets just to figure out where my money was
            actually going. It started as a weekend project for me and my
            friends, and turned into a clean, focused way to see your spending
            on your own terms.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ClientOnly fallbackHeight="h-10">
        <WaveDivider className="-my-2" scrollOffset={0} />
      </ClientOnly>

      {/* Why SpendWise exists */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Why SpendWise exists
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={Sparkles}
            iconColor="text-indigo-300"
            ringColor="from-indigo-500/30 to-indigo-500/0"
            title="Clarity over clutter"
            body="A modern, focused dashboard that surfaces what's actually useful — trends by category, source, and time period — without the noise of typical banking apps."
          />
          <FeatureCard
            icon={Banknote}
            iconColor="text-emerald-300"
            ringColor="from-emerald-500/30 to-emerald-500/0"
            title="Your data, your rules"
            body="Connect a bank via Plaid or import CSVs. Define your own Smart Categories, rename messy descriptions, and exclude noise — all without us guessing for you."
          />
          <FeatureCard
            icon={Lock}
            iconColor="text-pink-300"
            ringColor="from-pink-500/30 to-pink-500/0"
            title="Personal, not commercial"
            body="SpendWise is a personal / friends-and-family project. Plaid access is read-only, tokens are encrypted at rest, and your data stays scoped to your account."
          />
        </div>
      </section>

      {/* What it is / isn't */}
      <section className="grid gap-4 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur sm:grid-cols-2 sm:p-8">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest text-emerald-300">
            What it is
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <Bullet color="bg-emerald-400">A read-only view of your spending</Bullet>
            <Bullet color="bg-emerald-400">CSV uploads + Plaid bank connections</Bullet>
            <Bullet color="bg-emerald-400">User-defined rules, categories, and CSV export</Bullet>
          </ul>
        </div>
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest text-rose-300">
            What it isn&apos;t
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <Bullet color="bg-rose-400">A budgeting or money-movement tool</Bullet>
            <Bullet color="bg-rose-400">A multi-currency or business accounting app</Bullet>
            <Bullet color="bg-rose-400">Anything that shares your data with third parties</Bullet>
          </ul>
        </div>
      </section>

      <ClientOnly fallbackHeight="h-10">
        <WaveDivider className="-my-2" scrollOffset={1257} />
      </ClientOnly>

      <TipJar />

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="h-3 w-3" />
        Questions or feedback?
        <a
          href="mailto:1rksnyder@gmail.com"
          className="underline-offset-4 hover:underline"
        >
          1rksnyder@gmail.com
        </a>
      </p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  iconColor,
  ringColor,
  title,
  body,
}: {
  icon: typeof Sparkles;
  iconColor: string;
  ringColor: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 backdrop-blur transition-colors hover:border-border/80 hover:bg-card/80">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-gradient-to-br ${ringColor} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`}
      />
      <div className="relative">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60">
          <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold">{title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />
      <span>{children}</span>
    </li>
  );
}
