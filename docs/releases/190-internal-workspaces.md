# Release 190 — Organized internal workspaces

## Purpose

Make the internal business pages use a coherent WOW/INFINITY layout and the existing curved bottom navigation. Product, client and invoice records should remain identifiable while their details or actions are open, and mobile users should not have to choose between duplicated action bars.

## Changes

- Product cards retain their image and name, show the saved active USD price tier, and expose the original Edit and Invoice actions. Details expand to their natural height. Delete keeps its original confirmation handler and a localized accessible name.
- The product form reuses its original nodes in this order: identity, image, pricing, shipping packages. Calculated totals are separated from editable identity fields; physical dimensions and shipping dimensions retain their original calculations.
- Product filters and card columns respond to available width. The category chooser uses the full form width. Barcode category cards remain compact enough to leave room for product results; repeated model/name text is removed only when identical.
- Client and invoice cards keep their identity visible while their original actions expand. Explicit action disclosures support keyboard activation and Escape. Collapsed actions and invoice sections are removed from keyboard navigation.
- Invoice form groups stack on mobile without revealing conditionally hidden fields. Existing translated labels name fields and table controls. Tables scroll within their own region; summary values and touch targets are readable.
- Payment methods have radio semantics and keyboard navigation. Payment, reports, currency, cashbox, statement and cart surfaces share consistent spacing and typography.
- Mobile duplicate action buttons are hidden only while the real bottom navigation provides the equivalent original action. Source forwarding still checks stage visibility, disabled/busy state, inert ancestors and separate dialogs. Desktop actions return when the mobile dock is absent. Product Reset remains available because it has no matching bottom slot.
- Footer availability recovers when page or control entry animations finish. Barcode price selection raises the same footer above its own overlay while preserving the higher layers of independent dialogs; cancellation and navigation clear the temporary stage.
- Empty company and barcode toolbar shells collapse without hiding the source-control ancestors. Compact headings use space released by docked Back controls.
- Removed stray JavaScript from the inline stylesheet immediately before the notification rule. The malformed stylesheet had left an empty notification container covering page controls after a toast. The existing quote-arrow decorator remains in `ui-navigation.js`.

## Preservation

The new workspace modules do not change stored records, database schemas, invoice calculations, exchange-rate sources, export builders or print templates. Added styles are screen-only. New captions support Arabic, English, Turkish, French and Russian. Release 189's company subsections and settings Save/Cancel coordinator remain in place.

## Verification

- All 59 Node test files: **571 passed, 0 failed, 0 skipped**. Focused regressions cover source forwarding, animation recovery, barcode overlay cleanup, disclosure state, original callbacks, translated labels, price selection and repeated rendering.
- Browser checks at 320, 390, 768 and 1280 pixels, plus 844×390 landscape. Arabic RTL and French LTR, light and dark themes were exercised.
- On the isolated local preview, created and edited a product, selected its active tier, searched the catalog, saved a client, saved an invoice and recorded a test payment through the original bottom actions. Checked quantity, totals and shipping volume; the notification fix restored normal pointer activation.
- Exercised client/invoice disclosures, invoice keyboard sections, payment-method keyboard selection, reports, exchange and cashbox layouts, barcode browsing and price selection, cart quantities, and cart-to-invoice transfer.
- Settings regression check confirmed a company subsection presents its specific title and the existing shared Save/Cancel/Back controls. Language and appearance preferences still work.
- Browser camera hardware was unavailable in the test environment; product browsing was used to exercise the barcode selection flow. Temporary records exist only on the preview origin.

## Delivery

The service-worker cache and app release marker are 190. The service worker precaches all five new workspace assets and the HTML loads them; navigation asset versions are advanced so installed clients can receive the update.
