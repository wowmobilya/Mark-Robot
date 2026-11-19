# Optional offline voice packs

## Bundled robot identity greetings

`assets/robot-identity/ar.mp3`, `ar-EG.mp3`, `tr.mp3`, `en.mp3`, `fr.mp3`, and `ru.mp3`
contain the application's fixed identity greeting in each supported language.
The wording follows the corresponding `messages[locale].greeting` string in
`robot-face.js`; no business records or report content were used to create them.
All six recordings use the user's selected **Mark - Natural Conversations**
voice, generated with Eleven v3 through the authorized Artlist connection.
They address الأستاذ حسن الحلو (localized in the other languages) and identify
the company as **WOW FURNITURE**, with the Arabic spoken form
**واو فِرْنِتْشَر** instead of the previous Infinity name. Arabic
has Syrian and Egyptian wording, selected in Robot settings; Turkish uses
the same Mark identity. Dialect describes the script, not an independently
certified accent. The original generated audio is kept without pitch changes,
speed edits or word/number splicing. These are fixed recordings, not voice models.

The application service worker can cache these small audio files with the app
shell. Playing the fixed introduction then needs neither an installed voice
pack nor a remote speech service. Variable reports require an installed speech
engine. The selectable reference pack below synthesizes new text from the
selected recording's speaker embedding; lightweight packs and local system
voices remain explicit alternative settings.

`assets/robot-identity/metadata.json` records exact scripts, hashes, generation
IDs, encoding, file sizes and measured decoded durations. Every MP3 is fully
decoded and checked for nonzero audio. No listening/transcription verification
or word alignment is fabricated. Provider-generated media does not inherit
the open-source model licenses of the local engines described below.

Mark's hosted generator is not a bundled offline inference engine. Newly
changing reports and selected text use the installed local pack or a local
device voice, visibly identified in the reading status and settings. No API
key, invented remote endpoint or hidden remote speech fallback is included.

## Local reading based on the selected sample

Release 179 adds a shared ZONOS3-Mini pack for changing reports and selected text.
It uses 192-value speaker embeddings extracted locally from the six approved
Mark recordings. This is a locally generated approximation, not an export of
the original Artlist/ElevenLabs Mark engine. Timbre, pronunciation and accents
can differ. The settings and report download sheet state that distinction.

The pack is approximately 922 MB, downloaded only after an explicit action, and
requires WebGPU with a compatible adapter. All five app languages share its
backbone and decoder. Arabic's Syrian/Egyptian preference selects the matching
reference embedding; the model language remains Arabic and there is no claim
of independently certified dialect accuracy. Existing saved `local` and
`device` choices are preserved. To switch an existing installation, select the
local voice based on the Mark sample, save, then download the shared pack.

`reference-voice-assets.js` pins the runtime and model revisions and every
download's size and SHA-256. The installer checks available space, verifies
all bytes, and marks the pack ready only after the complete inventory is saved.
`reference-voice-host.js` and the guarded vendor worker use only verified cache
entries for all model metadata, shards, companions and embeddings. They have
no network fallback. Runtime module imports are also restricted to installed
cache entries by the service worker. Business report text and synthesized audio
never leave the device and are not retained in the model cache.

The common audio owner buffers a complete report into one validated PCM WAV,
uses the saved rate/volume, and releases the reference worker tree on stop,
replacement, removal or page exit. An idle timeout releases its GPU allocation
after 30 seconds. Selecting this reference voice never falls back automatically
to Nabra, Piper or a device voice. Its unsupported-device message explains the
WebGPU requirement. A missing pack presents the selected pack's download action.

Official native CPU generation produced unseen Arabic and Turkish financial
samples from these embeddings. The Arabic review sample at
`assets/reference-voice/samples/ar.wav` uses this app's actual vocalized
`moneyWords()` output. An independent local ASR check recognized
1,000,000.05 USD, zero USD and 5.50 USD; Turkish recognized a million dollars, zero
dollars and 5.50 USD. The checks still contain Arabic spelling/inflection
differences, so they do not establish flawless pronunciation, exact Mark
similarity, target-phone speed, or complete WebGPU offline execution. The
samples and technical provenance are retained for review. See the pinned
runtime's `vendor/zonos3/a50e141/README.md`, `LICENSE` and `NOTICE`.

## Shared controls and program text

Robot settings persist speech enable/disable, speed (75–125%), volume (0–100%),
Arabic greeting dialect, reading-engine preference and full-text preparation.
The same controls apply to identity, report and selected-text playback. Saving
changed voice controls stops the old playback; Stop and route/language changes
discard pending callbacks so voices cannot overlap.

The header reader speaks explicitly selected text on any program screen.
`WFProgramSpeech.speak({text,event,locale})` is the shared owner, together with
`preview({event})`, `stop()` and `getState()`. Reading requires a trusted user
gesture and rejects empty or oversized text. Arabic and Turkish selected text
normalizes only recognizable, unambiguous currency amounts. Business records,
IDs and account calculations are never rewritten.

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
and numbers derived from the exact displayed digits. Zero decimal fractions
are omitted; displayed zero, including -0.00, is spoken as zero. USD/TRY/EUR/SYP
fractions use named minor units, retaining their currency context.
`turkish-report-speech.js` provides the same source-validated interface in
Turkish. Both native and model-backed speech receive the normalized report.
Unsupported or inconsistent text is never guessed. The visible
report and accounting calculations are unchanged. Longer spoken clauses may
share one original display span; highlighting is at actual audio chunk start,
not invented word timing. The worker rejects phoneme overflow instead of
truncating speech.

`nabra-report-worker.js` runs inference entirely on the device. It verifies all
cached runtime/model bytes again, provides WASM bytes directly, and rejects
network fetches. Speech text and generated audio are never sent to a service or
saved in the voice cache. By default the complete text is generated before
playback, validated and joined as one PCM16 WAV. This removes generation and
source-switch gaps between clauses while preserving the model's natural pauses.
Preparation progress is visible and cancellation discards incomplete results.
Limits are 160 chunks, 32 MiB PCM and 20 minutes. This bounds audio buffering,
not the model's entire memory use. Users may opt into the original one-chunk
prefetch path when shorter initial waiting matters more than continuous audio.
Saved speed and volume apply to every voice, with pitch preservation for recorded
audio. A trusted tap primes the same audio
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
