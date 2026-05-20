// Built-in Smart Categories and rules that are baked into the CSV parser
// (see src/lib/csv/enrich.ts). Surfaced read-only on the Edits page so the
// user can see what's already applied without having to re-create them.

export const BUILTIN_SMART_CATEGORIES = ["Food Delivery", "Ride Sharing"] as const;

export type BuiltinRule = {
  phrase: string;
  matchField: "description";
  targetCategory: string;
  note?: string;
};

export const BUILTIN_RECATEGORIZE_RULES: BuiltinRule[] = [
  { phrase: "doordash", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "uber eats", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "ubereats", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "gopuff", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "go puff", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "grubhub", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "postmates", matchField: "description", targetCategory: "Food Delivery" },
  { phrase: "lyft", matchField: "description", targetCategory: "Ride Sharing" },
  {
    phrase: "uber",
    matchField: "description",
    targetCategory: "Ride Sharing",
    note: "excludes Uber Eats",
  },
];
