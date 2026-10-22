#!/usr/bin/env bash
# Installs or updates AdventWave on a shared Docker host (deploy/docker/README.md). On the server,
# from the checkout in $AW_HOME/app:
#
#   first time:  deploy/docker/install.sh --app-host listen.example.org --admin-host admin.example.org --admin-email you@example.org
#   afterwards:  deploy/docker/install.sh            (pulls, rebuilds, restarts what changed)
#
# The first run writes $AW_HOME/adventwave.env with fresh secrets. Email and object storage are
# filled with values that let the gateway start but cannot work (`.invalid` hosts); put the real
# ones in that file when you have them and rerun this script.
set -euo pipefail

AW_HOME=${AW_HOME:-/srv/adventtwave}; export AW_HOME
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo=$(cd "$here/../.." && pwd)
ENV_FILE="$AW_HOME/adventwave.env"
PROXY=${AW_PROXY_CONTAINER:-fibi-proxy-1}
PORT=${AW_GATEWAY_PORT:-8090}
APP_HOST="" ADMIN_HOST="" ADMIN_EMAIL="" PULL=1
ARGS=("$@")

while [ $# -gt 0 ]; do
  case $1 in
    --app-host) APP_HOST=$2; shift 2 ;;
    --admin-host) ADMIN_HOST=$2; shift 2 ;;
    --admin-email) ADMIN_EMAIL=$2; shift 2 ;;
    --no-pull) PULL=0; shift ;;
    *) echo "unknown argument $1" >&2; exit 2 ;;
  esac
done

setting() { grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-; }
secret() { openssl rand -hex "${1:-32}" 2>/dev/null || python3 -c "import secrets,sys; print(secrets.token_hex(int(sys.argv[1])))" "${1:-32}"; }

mkdir -p "$AW_HOME/backups" "$AW_HOME/vhosts" "$AW_HOME/downloads"

if [ ! -f "$ENV_FILE" ]; then
  [ -n "$APP_HOST" ] && [ -n "$ADMIN_HOST" ] && [ -n "$ADMIN_EMAIL" ] \
    || { echo "first run: pass --app-host, --admin-host and --admin-email" >&2; exit 2; }
  umask 077
  cat > "$ENV_FILE" <<CONF
# AdventWave settings, written by deploy/docker/install.sh on $(date -u +%F). Mode 600; never in git.
# Template with explanations: deploy/docker/adventwave.env.example. Apply changes: deploy/docker/install.sh
AW_APP_HOST=$APP_HOST
AW_ADMIN_HOST=$ADMIN_HOST
ADVENTWAVE_APP_BASE_URL=https://$APP_HOST
ADVENTWAVE_API_BASE_URL=https://$APP_HOST
ADVENTWAVE_CORS_ORIGINS=https://$APP_HOST,https://$ADMIN_HOST

ADVENTWAVE_DB_PASSWORD=$(secret)
ADVENTWAVE_DEV_ISSUER=false
ADVENTWAVE_LISTENER_TOKEN_SECRET=$(secret)
ADVENTWAVE_ADMIN_TOKEN_SECRET=$(secret)
ADVENTWAVE_SIGNING_SECRET=$(secret)

# Delete both lines once you have signed in to the admin portal and changed the password.
ADVENTWAVE_ADMIN_BOOTSTRAP_EMAIL=$ADMIN_EMAIL
ADVENTWAVE_ADMIN_BOOTSTRAP_PASSWORD=$(secret 16)

# EMAIL — NOT CONFIGURED YET. Sign-up and sign-in work; reset and verification emails fail (logged).
ADVENTWAVE_MAIL_MODE=smtp
ADVENTWAVE_MAIL_FROM=AdventWave <no-reply@$APP_HOST>
SPRING_MAIL_HOST=smtp.not-configured.invalid
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=not-configured
SPRING_MAIL_PASSWORD=not-configured
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_REQUIRED=true

# OBJECT STORAGE — NOT CONFIGURED YET. Listening works; uploading new recordings fails until set.
ADVENTWAVE_STORAGE_MODE=s3
ADVENTWAVE_S3_ENDPOINT=https://s3.not-configured.invalid
ADVENTWAVE_S3_REGION=us-east-1
ADVENTWAVE_S3_ACCESS_KEY=not-configured
ADVENTWAVE_S3_SECRET_KEY=not-configured
ADVENTWAVE_S3_MASTERS_BUCKET=not-configured
ADVENTWAVE_S3_DERIVED_BUCKET=not-configured
ADVENTWAVE_S3_PATH_STYLE=false
CONF
  echo "wrote $ENV_FILE"
fi
APP_HOST=$(setting AW_APP_HOST); ADMIN_HOST=$(setting AW_ADMIN_HOST)

if [ "$PULL" = 1 ] && git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
  before=$(git -C "$repo" rev-parse HEAD)
  git -C "$repo" pull --ff-only
  # bash reads a script as it runs it, so the rest of this file may just have changed under it:
  # start again from the top with the version that was pulled.
  if [ "$(git -C "$repo" rev-parse HEAD)" != "$before" ]; then
    exec "$here/install.sh" "${ARGS[@]}" --no-pull
  fi
fi
echo "==> release $(git -C "$repo" log -1 --format='%h %s' 2>/dev/null || echo unknown)"

AW_UID=$(id -u) AW_GID=$(id -g) "$here/aw" up -d --build --remove-orphans

echo -n "==> waiting for the gateway"
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:$PORT/actuator/health" >/dev/null 2>&1; then echo " — healthy"; break; fi
  echo -n .; sleep 2
done
curl -fsS "http://127.0.0.1:$PORT/actuator/health" >/dev/null 2>&1 \
  || { echo; echo "not healthy; ./aw logs --tail 100 gateway says why" >&2; exit 1; }

render() { sed -e "s/__APP_HOST__/$APP_HOST/g" -e "s/__ADMIN_HOST__/$ADMIN_HOST/g" -e "s/__CERT_NAME__/adventwave/g" "$here/vhosts/$1.template" > "$AW_HOME/vhosts/$1"; }
cp "$here/vhosts/__site-down.html" "$AW_HOME/vhosts/"   # shown when the containers are down
render 10-adventwave-http.conf
# The HTTPS block only once enable-https.sh has issued the certificate; refreshed on every update.
[ -f "$AW_HOME/vhosts/20-adventwave-https.conf" ] && render 20-adventwave-https.conf

if docker ps --format '{{.Names}}' | grep -qx "$PROXY"; then
  docker exec "$PROXY" nginx -t -q && docker exec "$PROXY" nginx -s reload && echo "==> proxy reloaded"
fi
echo "==> done. https://$APP_HOST and https://$ADMIN_HOST (once DNS and enable-https.sh are done)"
