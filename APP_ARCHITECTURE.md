# App Architecture

## Recommended Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- PostgreSQL
- Recharts
- TanStack Table
- Server actions or API routes for mutations
- Auth.js/NextAuth, Clerk, or Supabase Auth for authentication

## Main Routes

```text
/
  Landing or redirect to dashboard

/login
  User login

/register
  User registration

/files
  Uploaded files page

/transactions
  Transaction table page

/dashboard
  Spending dashboard page
```

## Suggested Folder Structure

```text
src/
  app/
    page.tsx
    login/
    register/
    files/
    transactions/
    dashboard/
    api/
      upload/
      files/
      transactions/
  components/
    layout/
    files/
    transactions/
    dashboard/
    ui/
  lib/
    auth.ts
    db.ts
    csv/
      parse-transactions.ts
      normalize-transaction.ts
      column-mapping.ts
    dashboard/
      aggregate-transactions.ts
  prisma/
    schema.prisma
  types/
    transaction.ts
```

## Database Models

Recommended Prisma models:

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String?
  files        UploadedFile[]
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model UploadedFile {
  id                     String        @id @default(cuid())
  userId                 String
  user                   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  originalFilename       String
  storedFilename         String
  fileSize               Int
  mimeType               String
  uploadStatus           String
  rowCount               Int           @default(0)
  parsedTransactionCount Int           @default(0)
  transactions           Transaction[]
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt
}

model Transaction {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  fileId          String
  file            UploadedFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  transactionDate DateTime
  postedDate      DateTime?
  description     String
  merchant        String?
  amount          Decimal
  category        String       @default("Uncategorized")
  transactionType String       @default("unknown")
  accountName     String?
  notes           String?
  rawData         Json
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([userId, transactionDate])
  @@index([userId, category])
  @@index([fileId])
}
```

## Data Ownership Rule

Every database query for files and transactions must filter by the authenticated user's ID.

Example rule:

- Never fetch `UploadedFile` or `Transaction` by ID alone.
- Always fetch by `{ id, userId }`.

## Upload Flow

1. User selects CSV file.
2. Server validates file type and size.
3. Server stores file.
4. Server creates UploadedFile record.
5. Server parses CSV rows.
6. Server normalizes valid rows.
7. Server creates Transaction records.
8. Server updates file status to processed or failed.

## Dashboard Aggregation

Dashboard calculations should be derived from normalized transactions.

Recommended aggregation functions:

- getTotalSpending
- getTotalIncome
- getNetCashFlow
- getSpendingByCategory
- getSpendingByMonth
- getSpendingByWeek
- getTopMerchants
