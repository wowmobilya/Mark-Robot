# Mark Robot 220 — WhatsApp-familiar chat with self-hosted audio/video calling

Status: **pull-request draft and unaccepted deployment**. This document is an operational specification and acceptance checklist. It is not proof the feature is live.

## Preserve the original WOW conversation

The existing chat module, its database functions, room/message IDs, text messages, attachments, reactions, voice notes, replies, unread counts, staff/customer permissions, five localizations and existing WhatsApp-familiar mobile layout remain authoritative. Do not replace the message feed, change conversation IDs, or re-import text messages during this change.

Add only two compact buttons (phone and camera) in the existing chat header. Incoming calls appear as an in-chat call sheet with Answer/Decline. Active calls display a remote video grid, local camera preview, duration, mute, camera on/off, audio-only/video switch, and End. Ending closes tracks immediately. Missed, declined and completed calls show as discrete system-like chips inside the chat transcript; their data is in separate private SQL tables and not fabricated text messages. Preserves existing WOW brand colors; do not copy WhatsApp artwork/trademarks.

The new frontend files are:
- \`modules/chat/realtime-channel.js\` — dependency-free Supabase Realtime v1 WebSocket, JWT refresh, private Broadcast, Presence
- \`modules/chat/call-manager.js\` — browser WebRTC peer negotiation, 1:1 calls, small group mesh (up to four), ICE, audio/video switching
- \`modules/chat/call-ui.js\` + \`call-ui.css\` — compact controls, call sheet, duration, in-chat history

This avoids adding another JS framework or introducing externally hosted scripts.

## Security and data flow

1. Only a current, server-verified WOW account with \`chat.view\` and \`chat.edit\` may create or join a call. Customer communication remains confined to permitted direct conversations with the owner. Staff group calls use a hard cap of four current authorized members.
2. The Edge service uses the existing signed-in Supabase Auth session and server WOW session epoch; unauthenticated clients cannot create calls or obtain TURN credentials.
3. SQL \`wow_voice.calls\` and \`wow_voice.participants\` store state, caller, media type, timestamps, duration evidence and allowed participants only. Existing \`wow_collab.messages\` remains untouched. These tables are isolated behind server-only RPC and enabled RLS with no public policies.
4. Realtime private topics are \`wow-call-room:<conversation_id>\` (ring/Presence) and \`wow-call:<call_id>\` (SDP/ICE). RLS policies on \`realtime.messages\` check the JWT user, Auth session, live WOW account/session/role, and original chat membership. Avoid using editable \`user_metadata\` claims.
5. Realtime Authorization caches policy grants for a connection. Short JWT lifetimes, periodic in-band token refresh, connection teardown on sign-out and live SQL revalidation prevent stale app access; **do not represent policy caching as per-message RLS evaluation**.
6. WebRTC carries audio/video end-to-end with browser DTLS-SRTP, over direct ICE or coturn relay. Audio/video is not recorded or placed in the database. SDP and ICE payloads are ephemeral Realtime messages only. No third-party paid calling API is required.
7. Call state and completion history persist after disconnect; active calls expire via server timeouts. A call is not considered proven connected until a browser peer connection reports \`connected\` and the server is notified.

## Ubuntu coturn deployment (host must have real public connectivity)

The script \`ops/coturn/install-ubuntu.sh\` installs open-source coturn after the operator provides a real domain and existing certificate. It creates \`/etc/coturn/shared-secret\` with mode \`0600\`, keeps private TLS keys restricted to the \`turnserver\` group and starts the service.

Run on a separately backed-up **Ubuntu 24.04 (or 22.04)** Internet-reachable VPS or public-IP machine. This example assumes your public DNS \`turn.example.com\` and valid TLS certificate already exist:

    sudo -i
    export TURN_FQDN='turn.example.com'
    export TURN_CERT='/etc/letsencrypt/live/turn.example.com/fullchain.pem'
    export TURN_KEY='/etc/letsencrypt/live/turn.example.com/privkey.pem'
    bash ./ops/coturn/install-ubuntu.sh

If the server is behind 1:1 NAT, set \`TURN_EXTERNAL_IP=PUBLIC_IP/PRIVATE_IP\` and forward the ports; **CGNAT without inbound port mapping is not suitable**. Open inbound TCP 3478, TCP 5349, UDP 3478 and UDP 49160–49259 at the host firewall and provider firewall. Permit outbound peer traffic; retain firewall egress restrictions and resource quotas appropriate to your hosting plan.

From the **server's secure terminal**, read the generated secret and store it in the Edge function environment as \`WOW_TURN_SHARED_SECRET\` (never paste it into ChatGPT, frontend, README, or GitHub). Also set:

    WOW_TURN_URLS=turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp

Provision cert renewal separately: after renewing the public certificate, atomically copy the certificate into \`/etc/coturn/tls/fullchain.pem\` and private key into \`/etc/coturn/tls/privkey.pem\` with ownership \`root:turnserver\` and mode \`0640\`, then restart \`coturn\`. Expired certificates will break TCP/TLS TURN connections.

The Edge function mints time-limited coturn REST credentials with HMAC-SHA1 using the private shared secret; HMAC-SHA1 is used **only for TURN credential derivation** (not for SRTP media encryption).

Without TURN, public STUN may work on friendly networks but reliability is not guaranteed. Coturn has no software licensing cost; internet bandwidth and an always-online public host can have costs.

## Deployment sequence

1. Inventory current Supabase project and existing Realtime settings; take database and Storage backups. Check \`realtime.messages\` RLS is enabled, but do not try to alter the protected Realtime table. Review preexisting Realtime policies before applying new call-topic policies.
2. Run the add-only migration \`supabase/modules/voice-calls.sql\` in an isolated test and the intended project after review.
3. Deploy the **complete** updated \`wow-cloud\` Edge bundle with \`wow_voice_service\` in the RPC allowlist, including the optional server-only TURN secret.
4. Verify new private topics reject unrelated users and revoked sessions, and that caller/callee both have live permissions. Confirm username/identity and role changes cannot promote customer access.
5. Run all Node/PGlite tests, source checks and remote Chromium fixtures on the exact final SHA.
6. Run physical cross-network tests: owner↔customer audio and video, staff↔staff, three staff group, mute/video toggle, denial of camera/mic, app foreground/background, reconnect and simultaneous dial race. Verify speech/audio lifecycle and push notifications do not steal audio unexpectedly.
7. Keep the old Galeri.TR data and old origin until all old model history, 278 legacy group messages and device IndexedDB are reconciled. This release must **not** delete or migrate those records.

**Important limits**: Group calling is peer-mesh and appropriate for up to 4 participants, not large meetings. An incoming call is guaranteed visible only while the chat module is active; app-closed OS ringing requires separate push/call integration and physical acceptance. No claim of stable mobile operation can be made solely from automated tests.

## Upstream references

- Supabase private Broadcast + Presence authorization: https://supabase.com/docs/guides/realtime/authorization
- Supabase Realtime Phoenix protocol: https://supabase.com/docs/guides/realtime/protocol
- MDN WebRTC perfect negotiation: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
- coturn project: https://github.com/coturn/coturn
