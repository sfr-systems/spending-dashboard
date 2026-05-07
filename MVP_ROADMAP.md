# MVP Roadmap

## Phase 1: Scaffold

Goal:
Create the base Next.js project with TypeScript, Tailwind, shadcn/ui, Prisma, and basic layout.

Deliverables:
- App shell
- Navigation
- Responsive layout
- Database connection
- Basic home page

## Phase 2: Authentication

Goal:
Allow users to register, log in, and log out.

Deliverables:
- Register page
- Login page
- Protected routes
- User session handling

## Phase 3: Database Schema

Goal:
Create database models for users, files, and transactions.

Deliverables:
- Prisma schema
- Migrations
- Database client
- Basic seed or test data if useful

## Phase 4: File Uploads

Goal:
Allow users to upload CSV files and view uploaded file metadata.

Deliverables:
- Upload form/dropzone
- File validation
- File metadata table
- Delete file action
- Per-user file ownership

## Phase 5: CSV Parsing

Goal:
Parse uploaded CSV files into normalized transaction records.

Deliverables:
- CSV parser
- Column mapping logic
- Amount normalization
- Date normalization
- Raw row storage
- File processing status

## Phase 6: Transactions Table

Goal:
Display parsed transactions in a unified table.

Deliverables:
- Transactions page
- Search
- Sort
- Filters
- Responsive table/card UI

## Phase 7: Dashboard

Goal:
Show interactive spending insights.

Deliverables:
- Summary cards
- Spending over time chart
- Spending by category chart
- Top merchants chart
- Filters

## Phase 8: Polish

Goal:
Improve UX, validation, error states, and reliability.

Deliverables:
- Empty states
- Loading states
- Error messages
- Delete confirmations
- Basic tests
- README
