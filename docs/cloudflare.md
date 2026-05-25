# Cloudflare Pages

This app is a plain Vite static site. Cloudflare Pages can serve it from the `dist` folder after `npm run build`.

## Option A: connect the GitHub repo

Use this if you want Cloudflare to rebuild the app whenever `main` changes.

1. Open Cloudflare Dashboard -> Workers & Pages -> Create -> Pages.
2. Connect the GitHub repo:
   `Kronchinator/dbs-banking-dashboard`
3. Use these build settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Node version: 22
```

4. Deploy.

No environment variables are needed. The app does not use a backend or bank API.

## Option B: deploy from your terminal

Use this if you want to push the built folder yourself.

```bash
npm install
npm run deploy:cloudflare
```

Wrangler will ask you to log in if you have not used it before. If you prefer API tokens, keep them out of the repo and pass them only in your shell session.

## Privacy check before deploy

Run this before publishing changes:

```bash
npm test
npm run build
git status --short
```

Also make sure there are no real bank CSVs in the repo. The `.gitignore` blocks `*.csv`, but it is still worth checking because public finance mistakes age badly.
