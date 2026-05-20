"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag, Trash2, Sparkles, EyeOff, Type, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TransactionRuleRow, RuleMatchField, RuleType } from "@/lib/rules";

type SmartCategory = { id: string; name: string };

interface Props {
  initialCategories: SmartCategory[];
  initialRules: TransactionRuleRow[];
  existingCategoryNames: string[];
}

const FIELD_LABELS: Record<RuleMatchField, string> = {
  any: "Description or Cleaned Name",
  description: "Description",
  cleanedDescription: "Cleaned Name",
};

export function EditsClient({
  initialCategories,
  initialRules,
  existingCategoryNames,
}: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<SmartCategory[]>(initialCategories);
  const [rules, setRules] = useState<TransactionRuleRow[]>(initialRules);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const restoreDefaults = async () => {
    setRestoring(true);
    setRestoreMessage(null);
    const res = await fetch("/api/rules/restore-defaults", { method: "POST" });
    setRestoring(false);
    if (!res.ok) {
      setRestoreMessage("Could not restore defaults");
      return;
    }
    const data = await res.json();
    const added = (data.createdCategories ?? 0) + (data.createdRules ?? 0);
    setRestoreMessage(
      added === 0
        ? "All defaults are already in place."
        : `Restored ${added} default${added === 1 ? "" : "s"}.`,
    );
    startTransition(() => router.refresh());
  };

  // Union of user-defined Smart Categories and Smart Categories already present
  // on existing transactions (e.g. CSV-derived "Food Delivery", "Ride Sharing").
  const recatOptions = Array.from(
    new Set([
      ...categories.map((c) => c.name),
      ...existingCategoryNames,
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const refreshDownstream = () => {
    // The transactions table and dashboard are server-rendered with rules
    // applied — bump the cached routes so they re-read on next visit.
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Defaults</p>
          <p className="text-xs text-muted-foreground">
            Restore the built-in Smart Categories and rules (Food Delivery, Ride Sharing). Won&apos;t
            touch anything you&apos;ve already created or kept.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" onClick={restoreDefaults} disabled={restoring}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {restoring ? "Restoring…" : "Restore defaults"}
          </Button>
          {restoreMessage && (
            <p className="text-xs text-muted-foreground">{restoreMessage}</p>
          )}
        </div>
      </div>

      <SmartCategoryCard
        categories={categories}
        onCreated={(c) => {
          setCategories((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
        }}
        onDeleted={(id) => {
          setCategories((prev) => prev.filter((c) => c.id !== id));
        }}
      />

      <RecategorizeRuleCard
        categoryOptions={recatOptions}
        rules={rules.filter((r) => r.type === "recategorize")}
        onCreated={(r) => {
          setRules((prev) => [...prev, r]);
          refreshDownstream();
        }}
        onDeleted={(id) => {
          setRules((prev) => prev.filter((r) => r.id !== id));
          refreshDownstream();
        }}
      />

      <RenameRuleCard
        rules={rules.filter((r) => r.type === "rename")}
        onCreated={(r) => {
          setRules((prev) => [...prev, r]);
          refreshDownstream();
        }}
        onDeleted={(id) => {
          setRules((prev) => prev.filter((r) => r.id !== id));
          refreshDownstream();
        }}
      />

      <ExclusionRuleCard
        rules={rules.filter((r) => r.type === "exclude")}
        onCreated={(r) => {
          setRules((prev) => [...prev, r]);
          refreshDownstream();
        }}
        onDeleted={(id) => {
          setRules((prev) => prev.filter((r) => r.id !== id));
          refreshDownstream();
        }}
      />

      {pending && (
        <p className="text-xs text-muted-foreground">Updating views…</p>
      )}
    </div>
  );
}

function SectionShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Tag;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-base font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function SmartCategoryCard({
  categories,
  onCreated,
  onDeleted,
}: {
  categories: SmartCategory[];
  onCreated: (c: SmartCategory) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/smart-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Could not create category");
      return;
    }
    const data = await res.json();
    onCreated(data.category);
    setName("");
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/smart-categories/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  };

  return (
    <SectionShell
      icon={Tag}
      title="Smart Categories"
      description="Default categories are seeded for you. Add your own here to use in rules below."
    >
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="new-category">New category name</Label>
          <Input
            id="new-category"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Coffee shops"
            maxLength={60}
          />
        </div>
        <Button type="submit" disabled={submitting || !name.trim()} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Badge variant="secondary" className="gap-1.5 pr-1">
                {c.name}
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="ml-1 rounded-sm p-0.5 hover:bg-background/60"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function RecategorizeRuleCard({
  categoryOptions,
  rules,
  onCreated,
  onDeleted,
}: {
  categoryOptions: string[];
  rules: TransactionRuleRow[];
  onCreated: (r: TransactionRuleRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [matchField, setMatchField] = useState<RuleMatchField>("any");
  const [targetCategory, setTargetCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phrase.trim() || !targetCategory) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "recategorize" satisfies RuleType,
        matchField,
        phrase: phrase.trim(),
        targetCategory,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Could not save rule");
      return;
    }
    const data = await res.json();
    onCreated(data.rule);
    setPhrase("");
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  };

  return (
    <SectionShell
      icon={Sparkles}
      title="Smart Category rules"
      description="When the chosen field contains a phrase, set the transaction's Smart Category."
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="recat-phrase">Phrase</Label>
          <Input
            id="recat-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. starbucks"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recat-field">Match in</Label>
          <Select
            id="recat-field"
            value={matchField}
            onChange={(e) => setMatchField(e.target.value as RuleMatchField)}
          >
            <option value="any">Description or Cleaned Name</option>
            <option value="description">Description</option>
            <option value="cleanedDescription">Cleaned Name</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recat-target">Smart Category</Label>
          <Select
            id="recat-target"
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
          >
            <option value="">Select…</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="submit"
          disabled={submitting || !phrase.trim() || !targetCategory}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add rule
        </Button>
      </form>
      {categoryOptions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add a Smart Category above or import some transactions first.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 text-sm">
                <span className="text-muted-foreground">If</span>{" "}
                <span className="font-medium">{FIELD_LABELS[r.matchField]}</span>{" "}
                <span className="text-muted-foreground">contains</span>{" "}
                <span className="font-medium">&ldquo;{r.phrase}&rdquo;</span>{" "}
                <span className="text-muted-foreground">→ Smart Category</span>{" "}
                <Badge variant="secondary">{r.targetCategory}</Badge>
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label="Delete rule"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function RenameRuleCard({
  rules,
  onCreated,
  onDeleted,
}: {
  rules: TransactionRuleRow[];
  onCreated: (r: TransactionRuleRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phrase.trim() || !target.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "rename" satisfies RuleType,
        matchField: "description",
        phrase: phrase.trim(),
        targetCategory: target.trim(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Could not save rule");
      return;
    }
    const data = await res.json();
    onCreated(data.rule);
    setPhrase("");
    setTarget("");
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  };

  return (
    <SectionShell
      icon={Type}
      title="Cleaned Name rules"
      description="When a transaction's Description contains a phrase, set its Cleaned Name."
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="rename-phrase">Phrase in Description</Label>
          <Input
            id="rename-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. amzn mktp"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rename-target">Cleaned Name</Label>
          <Input
            id="rename-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. AMAZON"
            maxLength={200}
          />
        </div>
        <Button
          type="submit"
          disabled={submitting || !phrase.trim() || !target.trim()}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add rule
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 text-sm">
                <span className="text-muted-foreground">If Description contains</span>{" "}
                <span className="font-medium">&ldquo;{r.phrase}&rdquo;</span>{" "}
                <span className="text-muted-foreground">→ Cleaned Name</span>{" "}
                <Badge variant="secondary">{r.targetCategory}</Badge>
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label="Delete rule"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function ExclusionRuleCard({
  rules,
  onCreated,
  onDeleted,
}: {
  rules: TransactionRuleRow[];
  onCreated: (r: TransactionRuleRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [matchField, setMatchField] = useState<RuleMatchField>("any");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "exclude" satisfies RuleType,
        matchField,
        phrase: phrase.trim(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Could not save rule");
      return;
    }
    const data = await res.json();
    onCreated(data.rule);
    setPhrase("");
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  };

  return (
    <SectionShell
      icon={EyeOff}
      title="Exclusions"
      description="Hide matching transactions from the Transactions table and the Dashboard."
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="excl-phrase">Phrase</Label>
          <Input
            id="excl-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. internal transfer"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="excl-field">Match in</Label>
          <Select
            id="excl-field"
            value={matchField}
            onChange={(e) => setMatchField(e.target.value as RuleMatchField)}
          >
            <option value="any">Description or Cleaned Name</option>
            <option value="description">Description</option>
            <option value="cleanedDescription">Cleaned Name</option>
          </Select>
        </div>
        <Button type="submit" disabled={submitting || !phrase.trim()} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Add rule
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exclusions yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 text-sm">
                <span className="text-muted-foreground">Exclude when</span>{" "}
                <span className="font-medium">{FIELD_LABELS[r.matchField]}</span>{" "}
                <span className="text-muted-foreground">contains</span>{" "}
                <span className="font-medium">&ldquo;{r.phrase}&rdquo;</span>
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label="Delete exclusion"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
