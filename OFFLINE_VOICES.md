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
Robot Settings. Synthesis runs in `offline-voice-worker.js` on the user's device.
Report text and generated speech are never sent to a speech service.

The first pack also downloads the shared runtime (29,608,649 bytes, about
29.6 MB). Later packs reuse it. Each pack is about 63.2 MB (English is about
63.5 MB). The exact model and runtime byte counts and SHA-256 hashes are pinned
in `offline-voice.js`. Both byte length and hash must match before a file is
cached. A pack becomes available only after its model, configuration, and all
shared runtime files are present and verified.

The dedicated `infinity-offline-voice-v1` cache is independent from application
release caches and from the financial database. Removing a pack deletes only
that pack's model, configuration, and readiness record. Shared runtime files are
retained for other packs. Browser site-storage eviction can require a download
again; the UI checks local availability instead of trusting a saved preference.

## Browser integration

Load `offline-voice.js?v=2` before the robot script. Precache this small script
and `offline-voice-worker.js?v=2` in the existing service worker. Do not precache
voice models or runtime binaries during page load.

The worker obtains runtime scripts, WASM, data, and model bytes directly from
CacheStorage. Runtime scripts use local Blob URLs; Piper receives its WASM and
data buffers directly, and ONNX receives a local Blob URL for its WASM. The
worker's `fetch` permits only Blob URLs and has no network fallback. It verifies
cached bytes again before executing runtime code or loading a model.

Inference uses one CPU/WASM thread, so cross-origin isolation headers and
SharedArrayBuffer are not required. Secure context, CacheStorage, Web Workers,
Web Crypto and WebAssembly SIMD are required. A browser that lacks them receives
an unsupported status; it can continue using an available local system voice.
Speed and voice pronunciation depend on the selected model, text, and device.

`speak()` returns a cancellable handle immediately. Cancellation stops playback
and terminates an in-flight inference worker. Mouth/reader callbacks begin on
actual media `playing` events; waiting between sentence chunks is reported
separately. Sentence offsets refer to the original supplied text. The models do
not provide word timestamps, and the application does not invent them.

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
| Arabic | `ar_JO-kareem-medium` | AliMokhammad/arabicttstrain; the upstream card refers to that dataset for licensing |
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
