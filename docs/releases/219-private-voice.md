# WOW Mark Robot 219 — private voice calls (acceptance gated)

## Why this design

Audio is peer-to-peer WebRTC (DTLS-SRTP media), with *only* ephemeral SDP/ICE negotiation through the authenticated WOW Edge service and a private Postgres `wow_voice` schema. The call feature reuses the existing chat account permissions: only two eligible members of the same **direct** room can call. Customers can call the owner, not arbitrary customers or staff. No audio recordings, phone-number dialing, paid communication API, new identities, or separate customer directory are introduced.

The JS module provides one-to-one voice calling, incoming call action, reject, hangup, mute, audio playback fallback, and WebRTC echo cancellation/noise suppression/auto gain. A live room must be open and the Chat module mounted to see an incoming call. This is **not** guaranteed OS-level ringing when the app is closed.

## Security and retention

- Every signaling RPC re-verifies an actual Supabase Auth session through `wow_actor`, the WOW session revocation epoch, live account permissions, active workspace and direct-chat membership.
- The service-only RPC `wow_voice_service` is not callable as `anon` or `authenticated`. Calls and signals are in a private RLS-protected schema and are not available to public API clients.
- Ringing offers expire in 35 seconds. Active calls require refresh at most every 90 seconds and can never exceed two hours from creation. Signals are deleted on ended/declined/missed call or after expiry; only transient call metadata remains.
- Call media travels exclusively through the WebRTC peer connection or its TURN relay. Call media is not routed through Supabase and the relay only sees encrypted RTP.
- There is a 256-signal bound per call, payload size bounds, speaker/recipient authorization, and a single active call per account in a workspace.
- No `service_role` secret, TURN shared secret, authentication token, or private report is in the repository.

## No paid provider / TURN operation

Default STUN-only mode does not incur a calling-provider subscription but cannot connect reliably behind all NATs, cellular networks and restrictive firewalls.

For reliable calling across difficult networks, deploy the open-source **coturn** on an internet-reachable host (a VPS or existing host with a public IP), with TLS, firewall and resource limits. Configure its REST-style shared-secret authentication and supply these **server-only** environment variables to the existing Supabase `wow-cloud` function:

- `WOW_TURN_URL=turns:turn.example.com:5349?transport=tcp`
- `WOW_TURN_SHARED_SECRET` = unique random secret, at least 32 characters, **set through secure dashboard/secrets, never commit it**.

The call service issues time-limited HMAC-SHA1 TURN credentials for a verified participant in an active call. This is coturn's REST credential mechanism, not an obsolete media cipher. The audio/media encryption itself is browser WebRTC DTLS-SRTP.

TURN itself is free open-source software; public server traffic and hosting are not necessarily free. An existing router behind carrier NAT is not a reliable TURN public host. Do not publish a static TURN password or expose an anonymous relay.

References: https://github.com/coturn/coturn , https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity , https://docs.livekit.io/transport/self-hosting/deployment/

## Deployment and acceptance gates

1. Full source and PGlite call-security tests must pass on the **exact branch head**, along with release verification and remote Chromium tests.
2. Inventory and back up the intended Supabase project `sldthbnigivpsqixccah`. Apply **additive** `supabase/modules/voice-calls.sql` only after reviewing the exact production schema; never reset source tables or move legacy messages with this migration.
3. Deploy the matching full `wow-cloud` Edge bundle after schema migration, with `wow_voice_service` in the module-RPC allowlist. A partial deployment of the `modules/chat.mjs` file alone is not sufficient.
4. For robust mobile connectivity, run and verify coturn with short-lived credentials over a trusted TURNS endpoint. Test Wi-Fi-to-cellular, cellular-to-cellular, permissions denied, two callers at once, hangup, call expiry and account revocation.
5. Run a real two-device owner↔customer call and staff↔staff call. Confirm microphone permission is requested only when dialing or answering, and that Chat continues to work while the call fails.
6. Verify that a closed PWA receives a call notification if background ringing is subsequently added. **This version does not promise background ringing**.
7. Only after real-device acceptance merge/deploy as the active app and announce calls as generally available.

The customer self-registration UI remains included in the main sign-in surface in all five languages. With no verified outbound email service, the registration/recovery entries show a clear unavailable message; they must not bypass mailbox confirmation.

## Preserve old records

Do not delete the old Galeri.TR application or its tables. Historical messages and customer inventory have not been imported into the new WOW collaboration schema. Finish ownership mapping, attachment SHA-256 verification, device IndexedDB exports and reconciliation first.
