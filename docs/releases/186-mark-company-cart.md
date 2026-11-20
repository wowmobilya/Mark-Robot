# Release 186: reader, company sections, sources, colors and Cart

## User-facing changes

- Company settings open a five-section hub: basic/contact, logo identity, tax
  registration, stamp/signature, and bank accounts. One child editor shows only
  the chosen section. Save commits only that section; Cancel restores its opening
  values and previews. Logo preview never saves another section's draft.
- Currency sources use searchable cards, category tabs and a detail screen.
  The researched bank catalog contains 67 entries, including managed-bank status
  and verified 2026 licensing changes. Banks are manual sources unless an actual
  quote feed is available; website links are not presented as live integrations.
  Applied rates/provenance change together only after a successful transaction.
- The reusable color dialog follows app theme tokens, with a color plane, hue,
  HEX, palette, current/new preview, Apply and Cancel. Preview causes no input
  event or storage write. Existing company draft and immediate tint handlers run
  only on Apply.
- Cart is a normal `#cart` section, with empty/restoring/filled states, sidebar
  and barcode navigation, quantities, removal, totals and explicit invoice
  transfer. Navigation never clears a cart. Unrelated invoice saves preserve it.
  Transfer retains the selected valid customer, separate price tiers, and ignores
  an abandoned navigation before the old delayed callback runs.
- Minimized reading controls occupy the actual app toolbar. The smart card
  expands into the report and folds into that toolbar slot; reopening preserves
  reading position. Speed is a themed 0.75–1.25 stepper, not a native dropdown.
- Dark robot artwork has a transparent background and light eyes/features on
  the dashboard, settings preview, report and toolbar.

## Speech behavior

Generated reading uses complete short phrases through the gesture-unlocked
native audio element, with one phrase prepared ahead. It avoids beginning a word
whose later PCM has not arrived, and no longer depends on a short main-thread
audio scheduling horizon. Delayed `play()` rejections from intentional pauses
cannot discard paused audio or terminate a newer resume. Generated PCM16 WAV is
validated before playback. Complete phrases are cached in RAM only, bounded to
32 entries and 16 MiB; cancellation/removal races cannot repopulate removed data.

The optional public PCM stream now decodes its first frame with all ten codebooks.
The exact hash-guarded upstream adapter also propagates partial-generation errors
instead of reporting an incomplete stream as successful completion.

Arabic reports use validated Syrian phrases/numbers and compact adjacent empty
categories. Net-zero activity is not described as absent activity. Nonzero and
negative amounts retain exact displayed precision; tiny values rounded to zero
remain identified as real signed values. No purchases statistic is invented.
The full source/offset validation runs before compaction, and grouped speech
highlights every original paragraph in its contiguous display span.

`voice-loudness.js` measures gated, K-weighted loudness and applies bounded gain
and smooth peak limiting to complete generated phrases. It yields between work
batches, respects cancellation, preserves sample count/rate and zero pauses, and
caches completed results weakly by source Blob and locale. User volume remains
independent. Saved identity recordings are unchanged.

Measured saved identity targets: Arabic −16.3, Turkish −16.2, English −16.6,
French −15.4 and Russian −16.1 LUFS. The stored local Arabic comparison sample
measured −23.9 LUFS / −3.3 dB true peak before processing; FFmpeg independently
measured −16.5 LUFS / −1.2 dB true peak afterward. Both contain 561,540 samples at
44.1 kHz (12.7333 seconds). These measurements establish loudness/format behavior,
not identical voice timbre or certified perceptual quality.

## Material voice limitation

The original greeting is an Artlist/Eleven v3 recording. The installed ZONOS3-Mini
pack is a different generator conditioned on its speaker embedding. Improvements
to wording, buffering, caching and volume do not establish identical Mark voice,
Syrian accent, or instant first synthesis on the user's hardware. Original-voice
runtime access remains a provider dependency documented in
`docs/research/mark-original-voice-access-2026-11-20.md`. No guessed provider ID,
endpoint, exported connector credential or hidden hosted fallback is present.

The model manifest, hashes, embeddings and existing 922 MB installation are
preserved. The release updates the small application shell only.

## Validation

Focused automated coverage exercises independent company commits/cancel,
real color input persistence handlers, all bank IDs and provenance failures,
the original Cart functions, speech ownership/pause/races/cache/PCM, checked
Syrian compaction, grouped highlighting and toolbar morphs. The repository-wide
test gate and inline JavaScript parse run before publication. Live application
review follows deployment; a GPU-less browser cannot establish local model
latency or auditory identity on the target device.
