# Security Requirements

## Sensitive Data

This app handles personal financial transaction data. Treat all uploaded files and parsed transactions as sensitive.

## Authentication

- Use a trusted authentication solution where possible.
- If implementing custom password auth, hash passwords securely.
- Never store plaintext passwords.
- Protect all app pages except login/register.

## Authorization

- Every file and transaction belongs to a user.
- Users must never access another user's files or transactions.
- Always filter data by authenticated user ID.

## File Upload Security

- Accept only CSV files.
- Enforce file size limits.
- Store files outside public web-accessible folders unless using signed URLs.
- Do not expose raw storage paths.
- Validate all parsed data.
- Handle malformed CSV files gracefully.

## Logging

Do not log:
- Full transaction descriptions
- Full CSV contents
- Raw financial records
- Passwords
- Auth tokens

## Environment Variables

Secrets must live in environment variables:
- DATABASE_URL
- AUTH_SECRET
- Storage credentials if applicable

## Deletion

When a user deletes a file:
- Delete the UploadedFile record.
- Delete associated Transaction records.
- Delete the stored file if file storage is implemented.

## MVP Security Acceptance Criteria

- Unauthenticated users cannot access files, transactions, or dashboard pages.
- Authenticated users can only access their own data.
- Uploads reject non-CSV files.
- Uploads reject oversized files.
- File deletion also removes associated transactions.
