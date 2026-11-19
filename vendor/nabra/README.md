# Arabic report speech — third-party notices and source

The downloadable Arabic report voice performs speech synthesis locally. The
application does not send report text or account amounts to a speech service.

## Nabra Arabic phonemizer

`phonemizer.mjs` bundles the Arabic phonemizer from
<https://github.com/oddadmix/nabra-tts/tree/16b5281ce61993df3526740990cf845a3f3036f4>.
Its JavaScript sources and the eSpeak build wrapper are provided in [`source`](source/).
The bundle exports only `phonemize`, `tokenize` and `initEspeak`. The application's
strict adapter rejects overlong or unmapped phonemes; it does not use the
upstream helper that truncates phonemes.

The Nabra client code is licensed under Apache License 2.0; see
[`APACHE-2.0.txt`](APACHE-2.0.txt). Its upstream notices are reproduced in
[`source/THIRD_PARTY_NOTICES.md`](source/THIRD_PARTY_NOTICES.md).

The embedded eSpeak NG 1.52.0 phonemizer and Arabic/English language data are
licensed under GNU GPL version 3 or later. The punctuation and phonemizer
behavior ported from the Python `phonemizer` project is GPL version 3. The
embedded combined phonemizer is distributed subject to those GPL terms; see
[`GPL-3.0.txt`](GPL-3.0.txt).

Corresponding eSpeak source, including dictionary and phoneme sources, can be
downloaded from this same server:

- [`espeak-ng-1.52.0-source.tar.xz`](espeak-ng-1.52.0-source.tar.xz)
- Original source: <https://github.com/espeak-ng/espeak-ng/tree/1.52.0>
- Archive SHA-256: `8205f91e86e008ee2cf3eb21b020f1e94bf4413bd26600fde6a9cac1d948d2e1`
- Archive size: 12,410,920 bytes (XZ compression; identical source tar contents)
- Nabra build script and C binding: [`source/espeak/build.sh`](source/espeak/build.sh),
  [`source/espeak/wrapper.c`](source/espeak/wrapper.c)
- Rebuild notes: [`source/BUILD.md`](source/BUILD.md)

The source archive is a separate source download. It is not part of the speech
pack or application precache.

## Nabra model and voice

The model and the `af_msa` voice are downloaded separately from the public
Nabra-7M-Distill-ONNX repository at the pinned revision
`bbac0f1e6b001bfae89871be366a4b000180deb2`:

<https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/tree/bbac0f1e6b001bfae89871be366a4b000180deb2>

The model card identifies an Apache-2.0 license. This is a single female Modern
Standard Arabic voice, distilled from Nabra-82M. It is not a cloned voice.

## ONNX Runtime Web

ONNX Runtime Web 1.31.1 is downloaded separately, with pinned file sizes and
SHA-256 hashes. Copyright Microsoft Corporation. Distributed under the MIT
License; see [`ORT-MIT-LICENSE.txt`](ORT-MIT-LICENSE.txt).

<https://github.com/microsoft/onnxruntime>

## Integrity

Every downloadable runtime, model, voice and phonemizer file is checked against
the application's pinned SHA-256 digest before installation and again before
use by the speech worker. Generated audio and report text are not written to
CacheStorage.
