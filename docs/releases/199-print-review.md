# Package-label print workflow review

## Scope

Reviewed and corrected `package-labels.js`. Added executable controller regressions in `tests/package-labels-lifecycle.test.cjs`. This review does not change the physical label renderer, print geometry, original artwork, or captions in the printed document.

## Findings corrected

1. **Deleted invoice preparation race.** The missing-invoice path now increments the preparation revision before resolving the source, clears busy/readiness state and stale preview content, and prevents an earlier image-decoding task from restoring readiness.
2. **Selection changes during native printing.** A print job retains its captured invoice, complete batch, barcode images and iframe. A later invoice request is queued; the latest requested invoice is prepared after native completion. The displayed selection remains consistent with the active job until then.
3. **Saved data changing in place.** A signature of the actual normalized label fields, issuer/customer identity and selected paper profile is checked before printing and again after print-document assets finish loading. Changes to an existing object are detected, including current issuer branding changes.
4. **Lost supplied images.** A rejected supplied image/logo is a blocking controller error. A genuinely absent optional logo remains optional. All source images are checked, including images first appearing on later sheets; every image and the font readiness of the final print document are awaited separately.
5. **Native dialog lifetime.** The iframe survives nonblocking `print()` return. Cleanup occurs on `afterprint`, a completed print-media transition, or explicit user recovery. Both modern and legacy media-query listener APIs are supported. Focus, visibility changes and a timer can reveal recovery controls, but cannot discard a still-open native print document.
6. **App update protection.** A registered update guard and `aria-busy` cover preparation and the full native-print lifetime. A second print activation cannot replace a pending or active job.
7. **Historical invoice fidelity.** Archived invoices and invoices with saved print identities do not refill sparse product fields from the live catalog. Explicit saved null/blank values remain unknown or blank. Current nonsnapshotted issuer logos and new identity captures use the established `wfCompanyLogo` resolver; existing saved identities, including explicit blank logos, remain unchanged.
8. **Localization lifetime.** Dynamic invoice-card captions use live DOM translation markers instead of accumulating detached nodes in the static translation registry. Archive actions and the archive toolbar carry the operations localization marker and refresh on language changes.
9. **Complete large batches.** Printing uses the complete captured batch, yields before constructing larger print jobs, and verifies the generated document's sheet and real-label counts before invoking native printing.

## Verification

The lifecycle tests execute the production controller declarations and functions using Acorn and a VM. The external boundaries are controlled image decoding, DOM creation, native printing and application navigation. The label core and barcode helper remain production code.

The initial 13 scenarios exposed 10 failures before the fixes. The completed suite contains 17 passing lifecycle regressions, including synchronous and asynchronous completion, legacy media listeners, explicit recovery, concurrent activations, queued selection, source deletion, in-place edits, image/font gates, unsafe images, historical values and a 41-label/six-sheet batch.

Verified commands:

```text
node --test tests/package-labels-lifecycle.test.cjs tests/package-labels.test.cjs tests/package-label-core.test.cjs
38 passed, 0 failed

node --check package-labels.js
passed
```

The lifecycle fixture explicitly selects `tw2008` so its eight-label sheet assertions remain independent of the new default paper profile. The production controller reads `core.defaultProfileId` and passes its current profile identifier to `buildLabelBatch`. The profile selector and persistence remain part of the root integration task.

## Physical verification boundary

These regressions verify source lifetime, content counts and asset readiness; they do not claim to test a physical printer, its driver scaling, stock alignment, or operating-system print UI. Browser/PDF comparison and the application's paper-profile acceptance checks remain the integration verification steps.
