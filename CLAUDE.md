# CLAUDE.md

## Project Name

Personal Spending Analysis Dashboard

## Goal

Build a modern, responsive web application that helps individuals understand their financial spending habits by uploading bank transaction CSV files, viewing cleaned transaction data, and analyzing spending trends over time.

## Core User Flow

1. User creates an account with username/email and password.
2. User logs in.
3. User uploads one or more CSV files containing bank transactions.
4. App stores the uploaded files and associates them with the user.
5. App parses uploaded CSV files into normalized transaction records.
6. User can view all uploaded files.
7. User can delete uploaded files.
8. User can view all parsed transactions in a table.
9. User can view an interactive spending dashboard with filters and charts.

## Main Pages

### Page 1: Files Page

Route: `/files`

Purpose:
- Show all files uploaded by the logged-in user.
- Allow user to upload new CSV files.
- Allow user to delete existing uploaded files.
- Show file metadata such as filename, upload date, number of parsed transactions, and processing status.

### Page 2: Transactions Page

Route: `/transactions`

Purpose:
- Show all parsed transactions in a single searchable, filterable table.
- Include fields such as transaction date, description, merchant, amount, category, transaction type, source file, and notes.
- Support sorting and filtering by date, category, amount, and file.

### Page 3: Dashboard Page

Route: `/dashboard`

Purpose:
- Show interactive financial insights.
- Analyze spending by month, week, category, merchant, transaction type, and time period.
- Include charts, summary cards, and filters.

## Non-Goals for MVP

Do not implement these in the first version:
- Plaid or direct bank integrations.
- AI categorization.
- Complex duplicate detection.
- Multi-currency support.
- Shared accounts.
- Budget planning.
- Mobile native app.
- Production-grade financial compliance beyond reasonable security best practices.

## Design Style

Use a clean, modern dashboard aesthetic:
- Responsive desktop and mobile layouts.
- Card-based interface.
- Simple navigation.
- Clear typography.
- Accessible color contrast.
- Minimal clutter.
- Tables should remain usable on mobile.

## Preferred Tech Stack

Use:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- PostgreSQL
- Recharts
- TanStack Table

Use server-side parsing where appropriate.

## Code Quality Rules

- Use TypeScript everywhere.
- Keep components small and focused.
- Prefer clear names over clever abstractions.
- Validate all uploaded files.
- Never trust user-uploaded data.
- Keep financial data scoped to the authenticated user.
- Add comments only where logic is non-obvious.
- Use accessible labels and semantic HTML.
- Use responsive design from the start.
- Avoid overengineering.

## Security Rules

- Users must only access their own uploaded files and transactions.
- Never expose raw file paths publicly.
- Validate CSV file type and size.
- Sanitize parsed values.
- Hash passwords if using custom auth.
- Prefer established authentication libraries.
- Use environment variables for secrets.
- Do not log sensitive transaction data in production.

## Development Approach

Build in phases:

1. Project scaffold and layout.
2. Authentication.
3. Database schema.
4. File upload and file list.
5. CSV parsing.
6. Transactions table.
7. Dashboard charts.
8. Polish, validation, and tests.

When implementing, complete one phase at a time and run checks before moving on.

## When Unsure

Make the simplest reasonable implementation that supports the MVP.
Ask only if a decision would significantly affect architecture, security, or data ownership.