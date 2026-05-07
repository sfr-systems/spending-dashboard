# UI Requirements

## Overall Style

The app should feel like a modern personal finance dashboard.

Use:
- Clean layout
- Soft cards
- Consistent spacing
- Clear typography
- Simple navigation
- Responsive grid layouts
- Accessible color contrast

## Navigation

Authenticated users should see navigation links for:
- Files
- Transactions
- Dashboard
- Account/logout

Desktop:
- Sidebar or top navigation.

Mobile:
- Collapsible menu or bottom navigation.

## Files Page UI

Components:
- Page header
- Upload card/dropzone
- Files table or cards
- Delete confirmation dialog
- Empty state

Empty state copy:
"You haven't uploaded any transaction files yet. Upload a CSV file to start analyzing your spending."

## Transactions Page UI

Components:
- Page header
- Search input
- Filters
- Transaction table
- Empty state

Table columns:
- Date
- Description
- Merchant
- Category
- Type
- Amount
- Source File

Mobile:
- Use card layout or horizontal scroll.

Amount formatting:
- Negative spending should be visually distinct from positive credits.
- Use currency formatting.

## Dashboard Page UI

Components:
- Date range filter
- Category filter
- Transaction type filter
- Summary cards
- Spending over time chart
- Spending by category chart
- Top merchants chart
- Recent transactions section

Summary cards:
- Total Spending
- Total Income
- Net Cash Flow
- Transaction Count

## Accessibility

- Use semantic HTML.
- Add labels to form controls.
- Ensure keyboard navigation.
- Ensure readable color contrast.
- Do not rely on color alone to communicate meaning.
