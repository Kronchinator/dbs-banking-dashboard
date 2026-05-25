# DBS Banking Dashboard

A private-first personal finance dashboard for DBS transaction CSV exports.

## What it does

- Upload a DBS transaction-history CSV in the browser.
- Parse debit and credit transactions locally.
- Categorize spending into practical buckets.
- Show cashflow, category mix, merchant patterns, and monthly trends.
- Generate rule-based AI-style insights for reducing waste and improving savings.

## Privacy model

The CSV is processed in-browser. Do not commit real bank CSV files. `.gitignore` excludes CSV files by default.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run build
```
