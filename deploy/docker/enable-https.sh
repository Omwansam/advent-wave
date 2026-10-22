#!/usr/bin/env bash
# Run once DNS for every host points at this server (directly or through Cloudflare): issues one
# Let's Encrypt certificate for the app, the admin portal and, when AW_SITE_HOST is set, the
# website, through the edge proxy's certbot and webroot; installs the HTTPS vhosts; and reloads the
# proxy. The certbot container renews it with the others. Run it again after adding the website:
# it reissues the same certificate with the third name.
set -euo pipefail

AW_HOME=${AW_HOME:-/srv/adventtwave}
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ENV_FILE="$AW_HOME/adventwave.env"
PROXY=${AW_PROXY_CONTAINER:-fibi-proxy-1}
CERTBOT=${AW_CERTBOT_CONTAINER:-fibi-certbot-1}
setting() { grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-; }
APP_HOST=$(setting AW_APP_HOST); ADMIN_HOST=$(setting AW_ADMIN_HOST)
SITE_HOST=$(setting AW_SITE_HOST || true)   # absent from installs made before the website
EMAIL=${AW_CERT_EMAIL:-$(setting ADVENTWAVE_ADMIN_BOOTSTRAP_EMAIL || true)}
HOSTS=("$APP_HOST" "$ADMIN_HOST")
[ -n "$SITE_HOST" ] && HOSTS+=("$SITE_HOST")

domains=()
for h in "${HOSTS[@]}"; do
  getent ahosts "$h" >/dev/null || { echo "$h does not resolve yet; add its DNS record first" >&2; exit 1; }
  domains+=(-d "$h")
done

# --expand: when the website is added, the existing certificate gains its name instead of a second
# certificate being issued beside it.
docker exec "$CERTBOT" certbot certonly --webroot -w /var/www/certbot --cert-name adventwave \
  "${domains[@]}" --expand --non-interactive --agree-tos --keep-until-expiring ${EMAIL:+-m "$EMAIL"}

render() {
  sed -e "s/__APP_HOST__/$APP_HOST/g" -e "s/__ADMIN_HOST__/$ADMIN_HOST/g" -e "s/__SITE_HOST__/$SITE_HOST/g" \
      -e "s/__CERT_NAME__/adventwave/g" "$here/vhosts/$1.template" > "$AW_HOME/vhosts/$1"
}

cp "$here/vhosts/__site-down.html" "$AW_HOME/vhosts/"
out="$AW_HOME/vhosts/20-adventwave-https.conf"
render 20-adventwave-https.conf
if ! docker exec "$PROXY" nginx -t -q; then
  rm -f "$out"
  echo "the proxy rejected the HTTPS vhost; removed it again, nothing changed" >&2
  exit 1
fi
# The website's block on its own, after the other two pass: if the proxy rejects it, the app and
# the admin portal still get their HTTPS.
if [ -n "$SITE_HOST" ]; then
  site_out="$AW_HOME/vhosts/30-adventwave-site-https.conf"
  render 30-adventwave-site-https.conf
  if ! docker exec "$PROXY" nginx -t -q; then
    rm -f "$site_out"
    echo "the proxy rejected the website's HTTPS vhost; removed it again, the other two are unchanged" >&2
  fi
fi
docker exec "$PROXY" nginx -s reload
for h in "${HOSTS[@]}"; do
  echo "https://$h -> $(curl -sk -o /dev/null -w '%{http_code}' --resolve "$h:443:127.0.0.1" "https://$h/")"
done
