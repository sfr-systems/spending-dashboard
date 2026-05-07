# Data Contract

## Purpose

This document defines the expected transaction data model and how uploaded bank CSV files should be normalized.

## MVP Assumption

Different banks export different CSV formats. For the MVP, support a flexible parser that attempts to map common column names to normalized transaction fields.

## Common Source CSV Columns

Possible date columns:
- Date
- Transaction Date
- Posted Date
- Posting Date

Possible description columns:
- Description
- Memo
- Name
- Merchant
- Payee

Possible amount columns:
- Amount
- Debit
- Credit
- Withdrawal
- Deposit

Possible category columns:
- Category
- Type

## Normalized Transaction Schema

Every parsed transaction should be converted to:

```ts
type NormalizedTransaction = {
  transactionDate: string;
  postedDate?: string;
  description: string;
  merchant?: string;
  amount: number;
  category?: string;
  transactionType: "debit" | "credit" | "transfer" | "fee" | "refund" | "unknown";
  accountName?: string;
  notes?: string;
  rawData: Record<string, string>;
};
```

## Amount Rules

Use these rules:
- Negative amount means money spent.
- Positive amount means money received.
- If CSV has separate Debit and Credit columns:
  - Debit should become a negative amount.
  - Credit should become a positive amount.
- Strip currency symbols and commas.
- Empty amount values should fail validation for that row.

## Date Rules

- Normalize dates to ISO format where possible: `YYYY-MM-DD`.
- Support common US formats such as `MM/DD/YYYY`.
- Invalid dates should mark the row as invalid.

## Category Rules

For MVP:
- Use category from CSV if provided.
- If no category exists, default to `Uncategorized`.

Future:
- Add merchant-based categorization.
- Add user-editable categorization rules.

## Duplicate Handling

For MVP:
- Do not automatically deduplicate.
- Store all parsed transactions.

Future:
- Add duplicate detection using date, amount, description, and source file.

## Validation Rules

Reject or mark invalid rows when:
- Date is missing or invalid.
- Amount is missing or invalid.
- Description is missing.

## Raw Data

Always store the raw CSV row as JSON so future cleanup logic can reprocess transactions.
