# Product Requirements

## Authentication

Users should be able to:
- Create an account.
- Log in.
- Log out.
- Access only their own data.

Account fields:
- id
- email or username
- password hash if using custom auth
- createdAt
- updatedAt

## Uploaded Files

Users should be able to:
- Upload one or more CSV files.
- View a list of uploaded files.
- Delete an uploaded file.
- See upload status.

File fields:
- id
- userId
- originalFilename
- storedFilename
- fileSize
- mimeType
- uploadStatus
- rowCount
- parsedTransactionCount
- createdAt
- updatedAt

Upload statuses:
- uploaded
- processing
- processed
- failed

## Transactions

Each uploaded CSV should be parsed into normalized transaction records.

Transaction fields:
- id
- userId
- fileId
- transactionDate
- postedDate
- description
- merchant
- amount
- category
- transactionType
- accountName
- notes
- rawData
- createdAt
- updatedAt

Transaction type examples:
- debit
- credit
- transfer
- fee
- refund
- unknown

## Files Page

The files page should include:
- Upload button/dropzone.
- List of uploaded files.
- File name.
- Upload date.
- File size.
- Processing status.
- Number of transactions.
- Delete action.

## Transactions Page

The transactions page should include:
- Unified transaction table.
- Search.
- Sort by date, amount, category, merchant.
- Filter by date range.
- Filter by category.
- Filter by transaction type.
- Filter by uploaded file.
- Mobile-friendly table behavior.

## Dashboard Page

The dashboard page should include:
- Total spending for selected period.
- Total income/credits for selected period.
- Net cash flow.
- Spending by category.
- Spending over time.
- Top merchants.
- Transaction count.
- Average transaction amount.
- Filters for date range, category, transaction type, and source file.

## Dashboard Visualizations

Recommended MVP charts:
- Monthly spending line chart.
- Category spending bar chart.
- Category spending pie/donut chart.
- Top merchants bar chart.
- Weekly spending trend chart.

## Responsive Design

The application must work on:
- Desktop
- Tablet
- Mobile

Mobile requirements:
- Navigation should collapse cleanly.
- Tables should be horizontally scrollable or convert to cards.
- Dashboard cards should stack vertically.
