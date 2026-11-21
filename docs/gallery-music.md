# Optional gallery background music

This module closes the small background-music preference gap in the Galeri.TR feature merge. It adds music controls to the existing **Gallery** and **Gallery Studio** routes, using WOW theme variables and Arabic, Turkish, English, French and Russian labels. It does not change orders, authentication, private file permissions or the database.

## User behavior

- Music starts only when the user presses **Play music**. Script-generated clicks, restoring a preference, opening a route and reloading the application never start it.
- The initial volume is 18%. The user can change it from 0% to 100%; the control remains keyboard accessible.
- Playback uses native `<audio preload="none">`. The element has no source until the first accepted gesture, then loops the bundled original track. Its status follows native events and the `play()` promise. A rejected or missing recording produces a visible, localized message and no automatic retry.
- Playback stops when the document is hidden, the owning route becomes inactive, the user leaves, the account/endpoint/workspace/session changes, access is locked or revoked, or the controller is disposed. The inactive-route check also covers a dirty studio form intentionally retained by the application shell.
- Existing `wf-program-speech-state` activity pauses music, including preparation and paused speech ownership. Stopping speech does not resume music. Playback of another native audio/video element also pauses it. The module does not take over the speech system's media-session controls.
- An unresolved native play attempt cannot overlap a new attempt. Cancellation pauses and unloads it; its late events and promise continuation must remain silent. The old element retains its media guards only until that promise settles, then removes them.

## Offline preferences and asset boundary

The only persistent music setting is `wf.gallery.music.v1` in local storage. It contains at most **8** endpoint/workspace/account preference records and **12,288 UTF-8 bytes** in total, evicting older records first. Each record stores volume and the last selected enabled preference. The enabled preference changes the invitation to press Play; it never authorizes automatic playback. No password, token, email, company document or audio bytes are stored there. Invalid or unavailable storage leaves the controls usable for the current visit.

The sound is one public, non-business application asset: `assets/gallery/wow-ambient-v1.mp3`. The versioned filename must be included in the release's offline shell assets. Once that installation succeeds, the small track is available offline with the rest of the application. Installation may cache this asset before a user plays it; `preload="none"` describes the audio element's behavior, not the service worker's installation. Browser storage removal or an incomplete installation can still remove offline availability, which the visible error handles.

No external music service, legacy Pixabay recording, private signed URL, custom upload, new dependency or Supabase schema is used. My Files remains account-private. A future company-selected private soundtrack would require its own explicit shared-asset authorization contract.

## Integration contract

Load `modules/gallery/music.js?v=1` before `modules/gallery/workspace.js`. Its browser API is:

```js
const music = WFGalleryMusic.mount({
  container, api, lang: 'ar', permission: 'gallery.view'
});
music.updateLanguage('tr');
music.dispose();
```

`api.getSession()` and `api.can(permission)` must describe the current authorized module session; `WFCloud.getConfig().endpoint` supplies the public endpoint namespace. Gallery Studio passes `gallery.edit`. The controller resolves the fixed, same-origin asset path relative to its own script, including when the app is hosted under a subdirectory.

The narrow existing workspace hooks mount the controls outside catalog redraws and forward language updates and disposal. Release assembly must add the script and MP3 to the HTML/service-worker/verification manifests, bump the gallery workspace and CSS cache versions, and preserve native byte-range playback when serving a cached MP3. These assembly files are maintained separately from this module.

## Original recording and reproducibility

**WOW Gallery Ambient 1** was synthesized locally for this project on 2026-11-21. No third-party recording or sampled music was used. The composition is a soft four-chord sine pad with a small second harmonic and overlapping envelopes. Frequencies are quantized to complete cycles across the 16-second synthesis period so the underlying waveform joins continuously.

| Property | Value |
| --- | --- |
| File | `assets/gallery/wow-ambient-v1.mp3` |
| Size | 128,832 bytes |
| Encoding | MP3, mono, 22,050 Hz, 64 kb/s |
| Decoded sound | 16 seconds / 352,800 samples |
| Container duration | Approximately 16.065 seconds, including encoder delay/padding |
| Decoded peak / mean | −17.4 dBFS / −26.9 dBFS before the user's volume setting |
| SHA-256 | `7f82a2f73c58741b44fd63f966f36d93cbc05883c4d22c1ac3fab2f03a9719eb` |

Reproduce the composition with Python's standard library and an available FFmpeg build. FFmpeg is a development-time synthesis tool, not an application dependency. Encoded bytes can vary between encoder versions; changing the shipped sound should use a new versioned filename.

```python
from pathlib import Path
import math, struct, subprocess, tempfile, wave

rate, duration = 22050, 16
chords = ((48,55,60,64),(45,52,55,60),(41,48,52,57),(43,50,55,57))
notes = tuple(tuple(round(440 * 2**((n-69)/12) * duration) / duration
                    for n in chord) for chord in chords)
frames = bytearray()
for i in range(rate * duration):
    t, sample = i / rate, 0.0
    for group, frequencies in enumerate(notes):
        phase = (t - group * 4) % duration
        if phase >= 5:
            continue
        envelope = (math.sin(math.pi * min(phase/.8, 1) / 2)**2
                    * math.cos(math.pi * max(phase-3.4, 0) / 3.2)**2)
        for j, frequency in enumerate(frequencies):
            angle = 2 * math.pi * frequency * t + (group+j) * .31
            sample += envelope * (math.sin(angle) + .12*math.sin(2*angle)) * .035
    frames.extend(struct.pack('<h', round(max(-1, min(1, sample)) * 32767)))

out = Path('assets/gallery/wow-ambient-v1.mp3')
out.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    source = Path(temporary) / 'original.wav'
    with wave.open(str(source), 'wb') as handle:
        handle.setparams((1, 2, rate, rate*duration, 'NONE', 'not compressed'))
        handle.writeframes(frames)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
        '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', str(rate), '-ac', '1',
        '-map_metadata', '-1', '-id3v2_version', '3',
        '-metadata', 'title=WOW Gallery Ambient 1',
        '-metadata', 'artist=WOW FURNITURE', str(out)
    ], check=True)
```

## Verification

Run the controller and native browser fixtures with:

```sh
node --test tests/gallery-music.test.mjs
CHROMIUM_PATH=/path/to/chromium node tests/gallery-music.browser.cjs
CHROMIUM_PATH=/path/to/chromium node tests/gallery-music-offline.browser.cjs
```

The controller fixture runs real module control flow with explicit DOM/media boundary doubles. It checks gesture policy, pending-play cancellation across session and visibility changes, retained inactive routes, speech, cleanup, preference isolation and bounds, storage failure, media failure, five locales, and the real gallery mount/redraw/disposal hooks.

The browser fixture serves only synthetic fixture origins and the repository's actual MP3. It uses native, **muted** audio without replacing its play promise, checks decoding/current-time advancement/looping, trusted clicks, preference restoration without autoplay, speech interruption, a genuinely network-pending play cancelled by a hidden route, and Arabic mobile/English desktop width. Muted headless playback does not prove that a physical speaker was heard. The assembled offline-cache behavior passed the remote Chromium gate recorded below; physical-device acceptance and deployment verification remain separate.

The separate `gallery-music-offline.browser.cjs` fixture registers the **actual root `sw.js`**, including its existing import scripts and precache logic, on a fresh loopback origin. Its file server accepts only exact public shell URLs listed by that worker; `/` and `/index.html` return a synthetic controller page, never the application's business-data bootstrap. Other paths are rejected, and the page/worker content-security policy forbids external connections. The server does not implement byte ranges, so the tested `206` responses must come from the real worker.

After the real installation finishes, that fixture verifies the cached full-track SHA-256, disables and clears Chromium's HTTP cache, and checks an online warm `Range: bytes=0-1` request without another server track request. It then sets the browser context offline and repeats the exact range/body/header assertions before a trusted click starts native muted playback. The playback clock must advance from the cached MP3 and the server's track-request count must remain unchanged. The fixture has a 90-second deadline and a dedicated bounded Chromium CI step. Running it with `--check-fixture` validates the public asset allowlist and source files without starting a server or browser; this static check is not a substitute for its native offline CI result.

### Observed remote Chromium result

The [GitHub Actions Chromium acceptance job](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018/job/136877221302) passed all four browser fixture steps on code commit [`bf428ba3bff01c20babfa6711d206ee1e822976a`](https://github.com/wowmobilya/WOW-Galeri/commit/bf428ba3bff01c20babfa6711d206ee1e822976a). The two music steps completed successfully with the following observed results:

| Fixture | Observed native Chromium evidence |
| --- | --- |
| `gallery-music.browser.cjs` | Actual muted MP3 decoding, playback-clock advancement and looping; trusted-gesture requirement; saved preference without autoplay; speech interruption; cancellation of a genuinely pending play when its retained route becomes hidden; Arabic mobile and English desktop layout. |
| `gallery-music-offline.browser.cjs` | Actual root `sw.js` precached the exact original MP3; online warm and offline range requests returned `206` with exact bytes and headers; trusted muted native playback advanced while the context was offline; playback added no server track request. |

This is remote CI execution evidence, not a local-browser claim. The local executor previously rejected Chromium startup with `socket() failed: Operation not permitted` before a page opened; syntax/static checks there were recorded separately. The successful remote job exercised a native browser with the synthetic fixture and public application assets, without a real account, provider or hosted workspace.

The result does **not** establish that sound was heard through a physical speaker, that Android/iOS phone or Safari behavior has been accepted, or that `galeri.wowfurniture.com.tr` was deployed and its installed service worker updated. Those device and deployed-target checks remain distinct from the completed Chromium fixture gate.
