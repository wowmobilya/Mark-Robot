#!/usr/bin/env bash
# coturn setup for dedicated Ubuntu 22.04 / 24.04 host with PUBLIC IP.
# Run only after DNS, certificate and network firewall are configured.
set -euo pipefail
umask 077
if [[ $EUID -ne 0 ]];then echo 'Run as root';exit 1;fi
: "$TURN_FQDN"
: "$TURN_CERT"
: "$TURN_KEY"
if [[ ! "$TURN_FQDN" =~ ^[a-z0-9.-]+$ || "$TURN_FQDN" == *..* ]];then echo 'Invalid TURN_FQDN';exit 1;fi
if [[ ! -s "$TURN_CERT" || ! -s "$TURN_KEY" ]];then echo 'Missing TLS PEM files';exit 1;fi
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends coturn openssl ca-certificates
getent group turnserver >/dev/null || { echo 'turnserver group missing';exit 1; }
install -d -m 0750 -o root -g turnserver /etc/coturn
install -d -m 0750 -o root -g turnserver /etc/coturn/tls
secret_file=/etc/coturn/shared-secret
if [[ ! -s "$secret_file" ]];then
  openssl rand -hex 32 > "$secret_file"
  chmod 0600 "$secret_file"
fi
secret="$(< "$secret_file")"
if [[ ! "$secret" =~ ^[a-f0-9]{64}$ ]];then echo 'Bad secret file';exit 1;fi
install -m 0644 -o root -g root "$TURN_CERT" /etc/coturn/tls/fullchain.pem
install -m 0640 -o root -g turnserver "$TURN_KEY" /etc/coturn/tls/privkey.pem
conf=$(mktemp)
cat > "$conf" <<EOF
listening-port=3478
tls-listening-port=5349
fingerprint
realm=$TURN_FQDN
server-name=$TURN_FQDN
use-auth-secret
static-auth-secret=$secret
min-port=49160
max-port=49259
total-quota=100
user-quota=4
stale-nonce
no-cli
no-loopback-peers
no-multicast-peers
no-tlsv1
no-tlsv1_1
cert=/etc/coturn/tls/fullchain.pem
pkey=/etc/coturn/tls/privkey.pem
EOF
if [[ -v TURN_EXTERNAL_IP && -n "$TURN_EXTERNAL_IP" ]];then
 if [[ ! "$TURN_EXTERNAL_IP" =~ ^[0-9.]+(/[0-9.]+)?$ ]];then echo 'Invalid TURN_EXTERNAL_IP';exit 1;fi
 printf 'external-ip=%s\n' "$TURN_EXTERNAL_IP" >> "$conf"
fi
install -m 0640 -o root -g turnserver "$conf" /etc/turnserver.conf
rm -f "$conf"
if [[ -f /etc/default/coturn ]];then
 if grep -q '^TURNSERVER_ENABLED=' /etc/default/coturn;then
  sed -i 's/^TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
 else printf '\nTURNSERVER_ENABLED=1\n' >> /etc/default/coturn;fi
fi
systemctl enable coturn
systemctl restart coturn
systemctl --no-pager --full status coturn | head -25
echo "coturn configured; open UDP 3478 and 49160-49259, TCP 3478 and 5349."
echo "Copy private secret in /etc/coturn/shared-secret to Supabase Edge secrets as WOW_TURN_SHARED_SECRET."
echo "Set WOW_TURN_URLS=turn:$TURN_FQDN:3478?transport=udp,turns:$TURN_FQDN:5349?transport=tcp."
echo "Never publish the secret in client code, GitHub or chat."
