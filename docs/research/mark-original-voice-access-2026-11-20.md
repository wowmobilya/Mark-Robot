# Original Mark voice: verified access boundary

The requested outcome is changing reports in the same Mark voice and Syrian
delivery as the saved identity recording, with stable playback across app updates.

## What is actually available

`assets/robot-identity/metadata.json` identifies the saved Arabic recording as
**Mark – Natural Conversations**, generated with **Eleven v3 via Artlist**,
Arabic language, stability `0.5`, and no voice effect. The MP3 is retained byte
for byte. The connected Artlist account still lists that voice and model.

The installed local pack is ZONOS3-Mini, conditioned on a 192-dimensional speaker
embedding derived from the recording. Its model, decoder and pronunciation are
different from the original generator. It must not be described as the original
Mark model or as an exact acoustic match. Syrian report wording and loudness
correction improve specific behavior; they do not change this boundary.

## Provider integration findings

- Artlist's published Enterprise API documents music catalog browsing, streaming,
  search and downloads. Its public index does not establish a runtime voiceover
  endpoint for this voice: <https://developer.artlist.io/welcome>.
- The authorized Artlist MCP connection can generate a voiceover, poll its queued
  generation and download the result. It is not a credential or speech-streaming
  service that can be embedded in the public static application:
  <https://help.artlist.io/hc/en-us/articles/38948588333469-Artlist-MCP-Connect-Claude-ChatGPT-and-VS-Code-to-Artlist>.
- ElevenLabs supports Eleven v3 through HTTP speech generation/streaming, but the
  available metadata does not establish the exact Artlist-to-ElevenLabs voice ID
  mapping. A matching voice name alone is insufficient:
  <https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/what-is-eleven-v3-alpha>.
- There is no verified provider API credential or authenticated speech backend in
  this GitHub Pages application. No guessed endpoint, guessed voice ID, exported
  connector session, or secret in public JavaScript has been added.

## Concrete remaining dependency

Obtain authorized provider access that verifies the exact underlying Mark voice.
Keep credentials in an authenticated server-side proxy, pin the verified model,
voice and settings, and send the validated Syrian narration through that service.
Do not silently fall back to a different engine when original-voice playback is
requested. Verify a newly generated report by listening before claiming matching
identity, accent or naturalness. New speech cannot be guaranteed to reproduce the
identical performance of a fixed recording merely by changing client settings.

The existing 922 MB local pack is preserved across release 186. It is not another
download of, or a substitute claim for, the proprietary original voice.
