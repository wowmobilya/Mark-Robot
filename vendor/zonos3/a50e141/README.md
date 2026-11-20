# Local reference speech runtime

The application uses ZONOS3-Mini to synthesize changing text on compatible
devices, conditioned on a speaker embedding extracted from the chosen Mark
greeting. This is **a locally generated approximation**, not an exported
Artlist/ElevenLabs Mark model. It cannot certify identical timbre or Syrian or
Egyptian pronunciation. Original Mark MP3 greetings remain separate recordings.

## Upstream and licenses

- Runtime: https://github.com/Zyphra/ZONOS3-Mini/tree/a50e14117d99181ba7f28047b451ba03ba1a09a9
- Model: https://huggingface.co/Zyphra/ZONOS3-Mini/tree/2921b8821772b0bd10a04456863d21abf9d2f283
- Runtime license and third-party notices: `LICENSE`, `NOTICE` in this directory.
- Model weights are published under Apache-2.0, as declared by the pinned model
  card. The Artlist-generated recordings and derived speaker references are
  separate assets; their provenance is recorded under `assets/robot-identity`
  and `assets/reference-voice/embeddings`.

`engine.js`, `upstream-worker.js`, and `codec-worker.js` are the unmodified output
of the pinned official browser build. `worker.js` is the application's
cache-only boundary, loaded before the upstream worker. The application passes
`cache:false` to upstream initialization so its own optional cache cannot bypass
the application installer and verification.

## Rebuild

With the pinned upstream checkout and its frozen lockfile:

```sh
corepack pnpm install --frozen-lockfile --filter zonos3-web --filter zonos-voice-studio
corepack pnpm --dir servers/web build
```

Node 24.22.3 and pnpm 10.34.9 were used. Rename the generated worker to
`upstream-worker.js` and retain the application's cache-only `worker.js` wrapper.
The native `spk-encoder-cli` produces float32[192] NPY embeddings from the six
recordings. That extraction requires the published speaker encoder only; the
browser pack does not include a reference encoder or upload voice samples.

The inventory generator `tools/prepare-reference-voice.py` combines published
LFS SHA-256 hashes and exact local-file hashes. After a local runtime or adapter
change, run it with `--refresh-local`. The pinned wrapper, runtime and
embeddings are installer assets. Host, core and metadata update with the app
shell so playback fixes preserve installed weights. Static imports retain
`reference-voice-assets.js?v=1` and `reference-voice.js?v=1`; the new host is
`reference-voice-host.js?v=2`. Offline loading prefers the current app shell.

## Offline boundary and device support

The shared pack is approximately 922 MB and serves Arabic, Turkish, English,
French and Russian. An explicit Download action is required. No weights are
downloaded just by opening Settings or a report. Installation verifies every
asset and checks storage space before marking the complete pack ready.

The worker tree reads only allowlisted, hash-verified Cache Storage entries.
Every manifest, selected LACI head, companion and speaker embedding is included.
Empty default-voice metadata avoids unused recordings and reference encoders.
Omitted editing/alternative-decoder features return deliberate local 404
responses. Missing or corrupted required bytes fail without a network fallback.

WebGPU and a compatible adapter are required. No WASM/CPU browser fallback is
claimed. Cancelling active generation destroys the worker tree; stopping
already-generated playback preserves a ready engine. Its five-minute idle
timer begins after playback releases ownership, and hiding the page releases
unused resources. Downloaded model data stays cached.
Business text and generated report audio are neither transmitted nor stored.

The native CPU samples in `assets/reference-voice/samples` demonstrate unseen
text synthesis from the embeddings. They do not establish target-phone latency,
auditory identity, or browser-offline success; those are separate checks.
