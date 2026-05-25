# Contributing

This is a small personal finance app, so keep changes boring and useful.

Good contributions:

- Better DBS merchant cleanup rules
- More accurate category detection for Singapore merchants
- Tests for weird CSV rows
- UI fixes that make the dashboard easier to read
- Privacy improvements

Please do not add analytics, remote logging, or any feature that sends transactions to a server by default.

## Development

```bash
npm install
npm test
npm run build
```

Add tests in `tests/finance.test.js` before changing parser or categorization behavior.
