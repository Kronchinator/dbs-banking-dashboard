# Privacy notes

This app is designed to keep bank data local.

## What stays local

- Uploaded DBS CSV files
- Parsed transactions
- Category assignments
- Spending summaries
- Filtered exports

The default app has no backend and no database. Refresh the page and the uploaded file is gone.

## What can still leak if you are careless

- Screenshots can reveal merchant names and amounts.
- Browser extensions can read page content if you have granted them broad permissions.
- A modified fork could add network calls. Review code before using someone else's hosted copy.
- If you commit a real CSV, GitHub will keep it in history even after you delete it from the latest commit.

## Safer usage

Run it locally, or host it on a private network such as Tailscale. If you deploy it publicly, treat the app as public software but keep the data private by uploading CSVs only from your own browser session.
