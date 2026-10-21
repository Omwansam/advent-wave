#!/usr/bin/env bash
# Run once DNS for both hosts points at this server (directly or through Cloudflare): issues one
# Let's Encrypt certificate for both through the edge proxy's certbot and webroot, installs the
# HTTPS vhost, and reloads the proxy. The certbot container renews it with the others.
set -euo pipefail

AW_HOME=${AW_HOME:-/srv/adventtwave}
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ENV_FILE="$AW_HOME/adventwave.env"
PROXY=${AW_PROXY_CONTAINER:-fibi-proxy-1}
CERTBOT=${AW_CERTBOT_CONTAINER:-fibi-certbot-1}
setting() { grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-; }
APP_HOST=$(setting AW_APP_HOST); ADMIN_HOST=$(setting AW_ADMIN_HOST)
EMAIL=${AW_CERT_EMAIL:-$(setting ADVENTWAVE_ADMIN_BOOTSTRAP_EMAIL)}

for h in "$APP_HOST" "$ADMIN_HOST"; do
  getent ahosts "$h" >/dev/null || { echo "$h does not resolve yet; add its DNS record first" >&2; exit 1; }
done

docker exec "$CERTBOT" certbot certonly --webroot -w /var/www/certbot --cert-name adventwave \
  -d "$APP_HOST" -d "$ADMIN_HOST" --non-interactive --agree-tos --keep-until-expiring ${EMAIL:+-m "$EMAIL"}

out="$AW_HOME/vhosts/20-adventwave-https.conf"
sed -e "s/__APP_HOST__/$APP_HOST/g" -e "s/__ADMIN_HOST__/$ADMIN_HOST/g" -e "s/__CERT_NAME__/adventwave/g" \
  "$here/vhosts/20-adventwave-https.conf.template" > "$out"
if ! docker exec "$PROXY" nginx -t -q; then
  rm -f "$out"
  echo "the proxy rejected the HTTPS vhost; removed it again, nothing changed" >&2
  exit 1
fi
docker exec "$PROXY" nginx -s reload
for h in "$APP_HOST" "$ADMIN_HOST"; do
  echo "https://$h -> $(curl -sk -o /dev/null -w '%{http_code}' --resolve "$h:443:127.0.0.1" "https://$h/")"
done
