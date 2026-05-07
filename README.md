# SpendWise — Personal Spending Analysis Dashboard

A web application for uploading bank transaction CSV files and analyzing personal spending habits.

## Tech Stack

- **Next.js 13.5** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **PostgreSQL**

## Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted, e.g. Supabase, Neon, Railway)
- npm 8+

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for session signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App base URL (use `http://localhost:3000` locally) |

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Push the database schema

```bash
npx prisma db push
```

> Use `npx prisma migrate dev` once you add the first migration for production.

### 5. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The app redirects to `/dashboard`.

## Available Routes

| Route | Description |
|---|---|
| `/dashboard` | Spending insights and charts |
| `/files` | Upload and manage CSV files |
| `/transactions` | View all parsed transactions |

## Scripts

```bash
npm run dev        # Start dev server (hot reload)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npx tsc --noEmit   # TypeScript type check
npx prisma studio  # Open Prisma GUI for the database
```

## Project Structure

```
src/
  app/              # Next.js App Router pages and layouts
  components/
    layout/         # Sidebar, mobile nav, nav links
    ui/             # shadcn/ui component stubs
  lib/
    db.ts           # Prisma client singleton
    utils.ts        # Tailwind class helper (cn)
  types/
    transaction.ts  # Shared TypeScript types
prisma/
  schema.prisma     # Database models
```

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 1 — Scaffold | ✅ Done | App shell, navigation, layout |
| 2 — Auth | ⬜ Next | Register, login, protected routes |
| 3 — DB Schema | ⬜ | Prisma migrations |
| 4 — File Upload | ⬜ | CSV upload + file list |
| 5 — CSV Parsing | ⬜ | Parse + normalize transactions |
| 6 — Transactions | ⬜ | Transaction table with filters |
| 7 — Dashboard | ⬜ | Charts and spending insights |
| 8 — Polish | ⬜ | Error states, tests, refinements |
