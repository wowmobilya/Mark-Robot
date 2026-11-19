# Optional offline voice packs

## Bundled robot identity greetings

`assets/robot-identity/ar.mp3`, `tr.mp3`, `en.mp3`, `fr.mp3`, and `ru.mp3`
contain the application's fixed identity greeting in each supported language.
The wording follows the corresponding `messages[locale].greeting` string in
`robot-face.js`; no business records or report content were used to create them.
The Arabic recording uses Nabra-82M's native Modern Standard Arabic voice,
with manually checked vowel marks and phrase-ending pauses. It is synthesized
locally as one continuous utterance; the phonemizer's internal syllable dots
are removed so they cannot introduce artificial pauses inside Arabic words.
The other four recordings use the pinned Piper models and WASM runtime listed
below. All five are fixed recordings played locally after the app caches them.
They use generic model voices, without cloning or attempting to impersonate
the user, developer, or another named individual.

The application service worker can cache these small audio files with the app
shell. Playing the fixed introduction then needs neither an installed voice
pack nor a remote speech service. Variable reports still require an available
local system voice or an installed offline voice pack.

`assets/robot-identity/metadata.json` records each voice's exact source text,
the Arabic synthesis text with pronunciation marks, hashes, model source,
encoding, file size, and duration measured from the fully decoded MP3. Each
file is decoded after encoding and checked for nonzero audio. No word or
sentence alignment is fabricated. The Arabic source is
[Nabra-82M](https://huggingface.co/oddadmix/Nabra-82M-v0.1), using its
[CPU ONNX export](https://huggingface.co/marwanelamami/Nabra-82M-v0.1-ONNX),
both published under Apache-2.0. The original model and dataset notices below
identify the other sources, including SIWIS attribution for the French voice.
The application does not redistribute the Nabra model; only the generated
identity recording is bundled, so phones do not download its model weights.

## User-installed packs for variable speech

The application downloads a voice only after the user selects **Download** in
Robot Settings or **Download report voice** inside the written report. Opening a
report never starts a model download. Its progress, cancellation and retry are
visible in the same sheet. After the explicit first download completes, that
report can begin speaking without another settings visit.

### Arabic report voice

The Arabic pack uses the female Modern Standard Arabic `af_msa` voice from
Nabra-7M-Distill-ONNX, pinned to revision
`bbac0f1e6b001bfae89871be366a4b000180deb2`. The FP16 model is 15,969,086 bytes;
voice styles are 522,240 bytes. Its own ONNX Runtime Web 1.31.1 and Arabic
phonemizer add 17,035,073 bytes. The complete first download is **33,526,399
bytes** (about 33.5 MB), independent of Piper's larger runtime.

`arabic-report-speech.js` validates the exact Arabic narration and segment
offsets against the committed report snapshot. It supplies vowel-marked phrases
and numbers derived from the exact displayed digits, including sign and both
decimal places. Unsupported or inconsistent text is never guessed. The visible
report and accounting calculations are unchanged. Longer spoken clauses may
share one original display span; highlighting is at actual audio chunk start,
not invented word timing. The worker rejects phoneme overflow instead of
truncating speech.

`nabra-report-worker.js` runs inference entirely on the device. It verifies all
cached runtime/model bytes again, provides WASM bytes directly, and rejects
network fetches. Speech text and generated audio are never sent to a service or
saved in the voice cache. One following chunk is prepared while the current
chunk plays. Arabic reports play at 1.12 times the generated audio's speed with
pitch preservation enabled. The native Arabic report fallback uses a speech
rate of 1.05 instead of the previous 0.94. Identity recordings and other
languages retain their existing speed. A trusted tap primes the same audio
element before asynchronous record reads or downloads, for mobile playback
compatibility.

The first explicit Arabic upgrade removes retired Kareem model/config/marker
entries. It removes the old Piper runtime only when no other language has an
installed or partial pack that needs it. Other language packs, unrelated caches,
and business records are preserved. No migration runs merely on page load.

Nabra's model/client and the embedded eSpeak phonemizer have separate licenses.
See [third-party notices and corresponding source](vendor/nabra/README.md).
The source archive is not included in the voice download or application cache.

### Other languages

Turkish, English, French and Russian retain their Piper models. Their first pack
also downloads the shared runtime (29,608,649 bytes, about 29.6 MB); later Piper
packs reuse it. Each voice is about 63.2 MB (English about 63.5 MB). Exact byte
counts and SHA-256 hashes are pinned in `offline-voice.js`. All files must pass
both checks before a voice becomes ready. Piper inference uses
`offline-voice-worker.js` on the user's device, with no remote inference.

The dedicated `infinity-offline-voice-v1` cache is independent from application
release caches and the financial database. Removing a pack deletes its model,
configuration or style data, and readiness record. Shared runtime files remain
available for reuse. Browser storage eviction can require a new download; the
UI checks actual local availability rather than trusting a saved preference.

## Browser integration

Load `offline-voice.js?v=3` and `arabic-report-speech.js?v=1` before the robot
script. Precache those small modules, both speech workers, and
`nabra-phonemizer.js?v=1`. Never precache models, large runtime binaries or source
archives during page load. The optional Arabic phonemizer bundle is installed
into the verified voice cache with the pack and imported from those bytes.

Both engines use one CPU/WASM thread, without cross-origin isolation or
SharedArrayBuffer. Secure context, CacheStorage, Web Workers, Web Crypto and
WebAssembly SIMD are required; Arabic additionally uses a module worker.
Unsupported browsers may still use an available native voice marked
`localService === true`. Network-backed system voices are never selected.

`speak()` returns a cancellable handle immediately. Cancelling stops playback
and in-flight inference; report close, route/language changes and visibility
changes also cancel an owned first download. Mouth/reader callbacks begin only
on actual media `playing` events. Word timestamps are not fabricated.
Pronunciation and speed remain model- and device-dependent; local synthetic
fixtures verify complete playback and value-preserving text, not perfect accent
or pronunciation for every possible amount or name.

## Pinned runtime sources

| Component | Version / source | Upstream license |
|---|---|---|
| ONNX Runtime Web | `onnxruntime-web@1.18.0`, `ort.wasm.min.js` and `ort-wasm-simd.wasm` | MIT, Microsoft |
| Piper phonemizer ES module | `@mintplex-labs/piper-tts-web@1.0.5`, `dist/piper-o91UDS6e.js` | Package wrapper: MIT, Mintplex Labs |
| Piper phonemizer WASM/data | `@diffusionstudio/piper-wasm@1.0.0` | Piper phonemizer: MIT; embedded eSpeak NG: GPL-3.0-or-later |

The binary dependencies are downloaded from the versioned npm packages through
jsDelivr; they are not copied into this application's repository. Sources and
build instructions remain available from their upstream projects:

- [ONNX Runtime source and license](https://github.com/microsoft/onnxruntime/tree/v1.18.0)
- [ONNX Runtime Web configuration](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)
- [Mintplex Piper browser wrapper](https://github.com/Mintplex-Labs/piper-tts-web)
- [Piper WASM build instructions](https://github.com/diffusionstudio/piper-wasm)
- [Piper phonemizer source](https://github.com/wide-video/piper-phonemize)
- [eSpeak NG source and license](https://github.com/rhasspy/espeak-ng)

## Selected voice sources and attribution

Models and configuration files are pinned to the compatible
`diffusionstudio/piper-voices` revision
`840e38a7e26d813bd6221b78cfbaefa3585b3f71`. The source model cards retain their
original dataset and training notices; repository-wide metadata is not used to
replace those notices.

| Language | Model | Original model-card dataset notice |
|---|---|---|
| Arabic (retired variable-speech pack) | `ar_JO-kareem-medium` | AliMokhammad/arabicttstrain; retained here for attribution to earlier releases |
| Turkish | `tr_TR-fettah-medium` | Nabu Casa voice datasets, CC0 |
| English | `en_US-ljspeech-medium` | LJ Speech dataset, public domain; model contributed by Bryce Beattie |
| French | `fr_FR-siwis-medium` | SIWIS French Speech Synthesis Database, CC BY 4.0; Junichi Yamagishi, Pierre-Edouard Honnet, Philip Garner and Alexandros Lazaridis, University of Edinburgh |
| Russian | `ru_RU-dmitri-medium` | Nabu Casa voice datasets, CC0 |

Original model cards:

- [Arabic Kareem](https://huggingface.co/diffusionstudio/piper-voices/blob/840e38a7e26d813bd6221b78cfbaefa3585b3f71/ar/ar_JO/kareem/medium/MODEL_CARD)
- [Turkish Fettah](https://huggingface.co/diffusionstudio/piper-voices/blob/840e38a7e26d813bd6221b78cfbaefa3585b3f71/tr/tr_TR/fettah/medium/MODEL_CARD)
- [English LJ Speech](https://huggingface.co/diffusionstudio/piper-voices/blob/840e38a7e26d813bd6221b78cfbaefa3585b3f71/en/en_US/ljspeech/medium/MODEL_CARD)
- [French Siwis](https://huggingface.co/diffusionstudio/piper-voices/blob/840e38a7e26d813bd6221b78cfbaefa3585b3f71/fr/fr_FR/siwis/medium/MODEL_CARD)
- [Russian Dmitri](https://huggingface.co/diffusionstudio/piper-voices/blob/840e38a7e26d813bd6221b78cfbaefa3585b3f71/ru/ru_RU/dmitri/medium/MODEL_CARD)

The original Piper contributors, model contributors, dataset creators, Mintplex
Labs, Diffusion Studio, eSpeak NG contributors and Microsoft retain their
respective rights and attribution. This integration does not claim ownership of
their models or runtime components.
