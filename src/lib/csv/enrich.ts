// Payment processor prefixes that appear before the actual merchant name.
// The asterisk form (DD *, SQ *) covers many banks; the bare-code form covers others.
const ASTERISK_PREFIX_RE = /^[A-Z]{2,5}\s*\*\s*/i;
const KNOWN_CODE_PREFIX_RE = /^(DD|SQ|TST|SP|APL|WPY|PPL|LNK|PAYPAL)\s+/i;

// Delivery/aggregator services where the description appends the restaurant name after
// the service name — we keep only the service name for consistent grouping.
const DELIVERY_SERVICE_PREFIXES = [
  "DOORDASH",
  "UBER EATS",
  "UBEREATS",
  "GOPUFF",
  "GO PUFF",
  "GRUBHUB",
  "POSTMATES",
  "INSTACART",
];

// Characters that separate words and should become a space (not just be dropped).
const WORD_SEPARATOR_RE = /[.\-\/\\|:;,_]+/g;

// Characters that don't separate words (possessives, quotes) — just remove.
const DROP_CHARS_RE = /['"`]+/g;

// Phone number patterns (10 digits, with optional separators).
const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// Explicit store/location number markers.
const STORE_NUMBER_RE = /\b(STORE|SHOP|NO|NUM|UNIT|LOC)\s*#?\s*\d+\b/g;

// Bare hash-number patterns like "#1234".
const HASH_NUMBER_RE = /\s*#\s*\d+/g;

// Standalone digit sequences of 4+ digits (order/transaction codes).
const DIGIT_CODE_RE = /\b\d{4,}\b/g;

// Alphanumeric codes: contain at least one digit AND one letter, 5+ chars (e.g. "AB1CD2EF").
const ALPHANUM_CODE_RE = /\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{5,}\b/g;

export function buildCleanedDescription(raw: string): string {
  let s = raw.toUpperCase().trim();

  // Strip processor prefix (asterisk form first, then known bare codes).
  s = s.replace(ASTERISK_PREFIX_RE, "");
  s = s.replace(KNOWN_CODE_PREFIX_RE, "");

  // For delivery services, the trailing portion is the restaurant/item — discard it.
  for (const svc of DELIVERY_SERVICE_PREFIXES) {
    if (s.startsWith(svc) && s.length > svc.length) {
      s = svc;
      break;
    }
  }

  // Remove phone numbers before other digit stripping.
  s = s.replace(PHONE_RE, "");

  // Remove explicit store-number markers.
  s = s.replace(STORE_NUMBER_RE, "");
  s = s.replace(HASH_NUMBER_RE, "");

  // Remove standalone digit codes.
  s = s.replace(DIGIT_CODE_RE, "");

  // Remove alphanumeric ID codes.
  s = s.replace(ALPHANUM_CODE_RE, "");

  // Replace word-separating punctuation with a space.
  s = s.replace(WORD_SEPARATOR_RE, " ");

  // Drop non-word punctuation (apostrophes, quotes).
  s = s.replace(DROP_CHARS_RE, "");

  // Collapse whitespace and trim.
  s = s.replace(/\s+/g, " ").trim();

  // Never return empty — fall back to the uppercased original so the record
  // is always distinguishable from the default empty-string DB value.
  return s || raw.toUpperCase().trim();
}

// Patterns that indicate a food-delivery transaction.
const FOOD_DELIVERY_RES = [
  /doordash/i,
  /\buber[\s*]*eats\b/i,
  /\bubereats\b/i,
  /\bgopuff\b/i,
  /\bgo[\s-]*puff\b/i,
  /\bgrubhub\b/i,
  /\bpostmates\b/i,
];

// Patterns that indicate a ride-sharing transaction.
// Uber is ride-share UNLESS it is also an UberEats transaction.
const LYFT_RE = /\blyft\b/i;
const UBER_RE = /\buber\b/i;
const UBER_EATS_RE = /eats/i;

export function buildDerivedCategory(description: string, originalCategory: string): string {
  if (FOOD_DELIVERY_RES.some((re) => re.test(description))) {
    return "Food Delivery";
  }

  if (LYFT_RE.test(description)) {
    return "Ride Sharing";
  }

  if (UBER_RE.test(description) && !UBER_EATS_RE.test(description)) {
    return "Ride Sharing";
  }

  return originalCategory;
}
