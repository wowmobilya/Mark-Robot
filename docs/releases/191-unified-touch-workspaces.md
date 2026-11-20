# Release 191 — Compact workspaces and shared touch input

## Purpose

Make invoices, products, barcode lookup and settings easier to use on phones and tablets, and provide one five-language keyboard for touch devices, including wide touch PCs.

## Changes

- Invoice essentials reuse their original fields in a compact grid. Pricing/payment and shipping/notes have separate disclosures. Mobile invoice lines pair quantity and price where space permits; larger cards also pair dimensions and color. Unit-price labels explicitly name the saved USD base price, while totals name the selected display currency.
- Product category choices use two cards per row on narrow phones. Ordinary form fields share rows where readable; descriptions and complex controls keep appropriate width. The mobile catalog filter is a horizontal strip. Catalog and product-form headings scroll with the content, and price conversions use two compact labelled rows.
- Dashboard sections use the saved home layout, with a single customization dialog for visibility, order and size. Existing cards are moved rather than cloned. Draft changes can be cancelled, and a failed preference save preserves the draft for retry.
- Dashboard, section and settings-editor headers share a curved lower edge. The settings editor centers its section title and original icon while keeping the close control reachable.
- The barcode reader, tier chooser and result reserve space for the existing curved bottom navigation. Results can expand to their full height. Cancellable transition timers prevent old selections from reopening results or hiding a restored scanner after cancellation/navigation. The not-found state correctly owns the result phase and clears stale product selection.
- One shared keyboard handles text, search, email, telephone, URL, password, number and multiline entry on touch-capable devices. Arabic, Turkish, English, French and Russian layouts include cursor movement, selection, backspace, clear, undo, paste and previous/next-field controls. Non-touch desktops keep ordinary input behavior.
- Keyboard editing preserves original input/change/blur handlers, partial numeric drafts, formatter-adjusted carets and drafts when a renderer replaces the original input. Focus transfer does not prematurely commit a custom color. A swipe starting on an input does not activate the keyboard. Existing HS/description pickers, readonly values, dates, selects and file controls keep their own interactions.
- Barcode manual entry uses the shared keyboard and its existing camera lifecycle. The currency calculator uses the shared numeric layout on touch devices.

## Preservation

The workspace changes retain existing product/client/invoice records, calculations, export builders and print templates. New layout styles are screen-only. The enhancement does not convert stored prices or replace the exchange-rate source. New captions and keyboard controls cover all five application languages.

## Verification

- `node --test tests/*.test.cjs`: **615 passed, 0 failed, 0 skipped**. Coverage includes original locale/script checks, invoice handler preservation, barcode timer races, home drafts and 16 shared-keyboard behavioral tests.
- Independent review reproduced and verified no-ID invoice-field replacement, formatter selection changes, picker behavior, touch scrolling/cancellation and the custom-color blur lifecycle. No blocking finding remained in those reviewed paths.
- Managed browser checks at 320, 390, 768 and 1280 pixels, plus 844 × 390 landscape. Verified two product category cards per row at 320 pixels, invoice line density at phone/tablet sizes, the 72-pixel curved settings header and barcode tier clearance above the dock in landscape.
- Browser interaction exercised all five keyboard layouts in one field, editing inside text, decimal prices, invoice quantity recalculation, display-currency changes, barcode manual input, cancellation, description pickers/custom entry and custom color. Wide touch-device behavior used an isolated preview fixture with simulated touch capability.
- The barcode formatter now preserves sequential `k`, `4`, `0`, `0` as `k 400` with the cursor at the end. Invoice quantity 2 at USD 125 recalculated to USD 250; switching display currency retained the USD unit price.
- Runtime asset URLs and service-worker precache versions agree. Whitespace checks preserve the existing HTML CRLF line endings.

## Validation limits

The cloud browser has no usable camera hardware. Barcode browsing and manual-entry paths were exercised; physical camera decoding was not verified. Actual iOS/Android software-keyboard visibility and finger gestures were not tested on physical hardware. The optional Playwright suite is separate from the Node gate because local Chromium cannot create its required singleton socket in this executor.

## Delivery

The application release marker and service-worker cache are 191. New home, invoice, barcode and touch-keyboard assets are precached. Changed existing assets have advanced URLs so installed clients can fetch the update.
