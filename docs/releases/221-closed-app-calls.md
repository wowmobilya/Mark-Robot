# Release 221 — Incoming call alerts while the WOW web app is closed

Status: **review branch only; not enabled on the public website**.

## Design and authorization

- A verified caller creates an audio/video invitation through \`chat.call.start\` on the existing WOW Edge service. Direct and small group conversation membership remains authoritative. Original \`wow_collab.messages\` and Galeri.TR records are **unchanged**.
- The private \`wow_voice\` room/call tables record only participants, call timestamps and status. They are not public PostgREST tables and never store raw audio, video, SDP or ICE.
- \`supabase/modules/voice-call-push.sql\` adds an **additive** call event type to the existing encrypted WOW Web Push infrastructure. An AFTER INSERT trigger on a newly invited participant creates one event for that eligible account's **previously opted-in active** push subscription(s), commits together with the invitation, and uses the existing queue wake.
- Before encrypted delivery, \`wow_notify.payload('call',...)\` rechecks the invite is still \`ringing\`, is within \`ring_until\`, and still has authorized room membership and active caller/recipient accounts. A completed, declined, revoked or expired call yields no recipient payload. Call notification TTL is constrained by \`ring_until\` (40 seconds) and current session.
- Service worker \`wow-push-sw.js\` handles \`kind:call\`, shows a persistent incoming call notice where supported and deep-links only to \`chat\` with server-validated UUIDs \`roomId\` and \`callId\`. Device binding is verified against account, workspace, push endpoint binding ID, session version and expiry. The user taps the notification to open the application; media cannot start in a service worker.
- A visible bell affordance in the existing conversation header can invoke \`WFPush.enable()\` from a trusted user gesture if notification enrollment is ready. No background permissions are bypassed.

## What “closed app” can and cannot guarantee

Web Push can wake a Service Worker and display an **incoming-call notification** while no page is open on supported browsers. This is **not** a native, always-running phone stack; it does not imply:
- Guaranteed ringtone/full-screen answer/decline UI after the OS force-stops the app or prohibits notifications.
- Starting a microphone, camera or peer connection before a user opens the page.
- Persistent browser timers and audio playback when the phone suspends a PWA.
- Delivery to uninstalled iOS webpages: iOS Web Push applies to eligible Home Screen web apps, with the user granting permission.
- Delivery after the application's *current* WOW push binding becomes ineligible. Existing WOW customer/employee session rules expire on inactivity (including a 30-minute idle limit), and the device is not entitled to new sensitive push messages until reauthenticated. The owner account policy differs. **Do not relax session/revocation protections just to make ringing appear persistent.**

For WhatsApp-like native lock-screen call experiences on both operating systems, a native Android/iOS application using the OS calling APIs and a properly authenticated long-lived device push registration is a separate feature; it requires a native installation, platform push provider setup, app signing and live device acceptance. A mobile website/PWA alone cannot guarantee this.

## Live acceptance gate

1. Exact-current-commit Node, PGlite and Chromium suites pass. Realtime policy function \`private_voice.allowed()\` is in a non-exposed schema to avoid publishing a privileged public RPC.
2. Back up the intended Supabase project and Storage; inspect existing \`realtime.messages\` policies. Deploy only additive SQL migrations and then the complete matching Edge bundle (not partial modules).
3. Keep old Galeri.TR data, 29 original inventory codes and 278 historical chat messages until verified reconciliation. Never reset a database to activate voice.
4. Obtain a public Internet-reachable coturn server with valid TLS; follow \`ops/coturn\`; put the shared TURN secret only in server/Edge secrets. A home router behind CGNAT without a reachable public mapping is not a reliable TURN host.
5. On real Android and installed iOS Home Screen devices, enable Web Push by a tap, verify subscriptions and actual delivery while the PWA is closed, verify denied notification permission, expired invitation and revoked account, and test the notification opens the *correct* private chat.
6. Test 1:1 voice, video, permissions, video toggle, hangup, camera/phone lock, Wi-Fi↔cellular, group 3–4 users and TURN-only scenarios; record failure diagnostics without retaining media.
7. Do not merge PR #32, change production, promise unrestricted free service, or delete old data before these gates.

Upstream: https://developer.mozilla.org/en-US/docs/Web/API/Push_API ,
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation ,
https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers ,
https://developer.android.com/reference/android/app/Notification.CallStyle .
