# Localization checks

The app remains a static GitHub Pages site. Node dependencies are only used for verification.

```sh
npm ci
npm test
```

`npm test` checks that interface maps and account statement labels cover Arabic, Turkish, English, French, and Russian, that every authored static binding resolves, and that scripts parse. The legacy number-to-words tables are excluded because French and Russian use their dedicated number algorithms.

To test the running UI, serve the repository in another terminal:

```sh
python3 -m http.server 3010
npm run test:browser
```

Set `CHROMIUM_PATH` to your Chromium executable (default `/usr/bin/chromium`), or install Chromium with `npx playwright install chromium` and adapt the executable path. `TEST_URL` selects a different server.

The browser checks all pages and languages, barcode lookup, price selection, cart labels, quantity retention when changing languages, account statements, invoice HTML, language persistence, and mobile layout. It uses a new browser context and in-memory fixtures; it does not save client, product, invoice, or payment records.

New authored UI copy must have all five translations. Use `data-i18n` for the main dictionary or explicit `data-wf-ui` bindings for bundled copy. Dynamic text must use its language dictionary or `wfUiText`; do not translate arbitrary input values, product names, customer names, or saved notes.

Run `npm run test:scanner` against the same local server to exercise a generated QR code through the ZXing fallback, scanner concurrency and cleanup, five flags, and touch layouts. The video input is simulated; verify physical cameras on target tablets separately.
