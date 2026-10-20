# Deploying AdventWave to one Linux server

Everything runs on one Ubuntu 24.04 server: Postgres, Redis, the gateway as a systemd service, and
Caddy for HTTPS in front of it. Audio lives in S3-compatible object storage (RFC 0006); the
gateway transcodes uploads itself. Listeners sign in with an AdventWave email and password
(RFC 0005), so the server needs an SMTP account for password-reset and verification emails.

```
            https://listen.example.org          https://admin.example.org
                      │                                   │
                ┌─────┴───────────────── Caddy ───────────┴─────┐
                │  /            → current/web (listener app)    │
                │  /            → current/admin (admin portal)  │
                │  /v1/*        → 127.0.0.1:8080 (gateway)      │
                └─────────────────────┬─────────────────────────┘
                                      │
          gateway (systemd, java 21) ─┼─ Postgres 16 (localhost)
                                      ├─ Redis (cache, rate limits)
                                      ├─ python3 + ffmpeg (transcode, in process)
                                      └─ object storage: masters bucket, derived bucket
```

Browsers fetch audio straight from the derived bucket through presigned links, and the admin portal
uploads masters straight to the masters bucket. Neither passes through the server.

## What you need first

- A server with **2 vCPU and 4 GB RAM** or more and **40 GB disk** (the database and transcode
  staging; audio is not stored here). Ubuntu 24.04 LTS.
- Two DNS names pointing at it: one for listeners, one for the admin portal. The examples use
  `listen.example.org` and `admin.example.org`.
- An S3-compatible provider with **two private buckets** (masters and derived) and an access key
  limited to them. AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2 and MinIO all work.
- An SMTP account (Postmark, Amazon SES, Mailgun, your mail host) allowed to send from the
  address you put in `ADVENTWAVE_MAIL_FROM`.

## 1. Server packages

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y openjdk-21-jre-headless postgresql redis-server python3 ffmpeg jq curl \
                    debian-keyring debian-archive-keyring apt-transport-https ufw
# Caddy, from its own repository (https://caddyserver.com/docs/install#debian-ubuntu-raspbian)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Only SSH and HTTPS from outside. Postgres, Redis and the gateway listen on localhost only.
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

Check: `java -version` says 21, and `ffmpeg -version` and `ffprobe -version` both work.

## 2. Database

```sh
sudo -u postgres createuser --pwprompt adventwave      # choose a long password; it goes in gateway.env
sudo -u postgres createdb -O adventwave adventwave
```

The gateway creates its schema on first start (Flyway, migrations V1 onwards). It needs no
superuser: the `pgcrypto` and `pg_trgm` extensions it creates are trusted on Postgres 16.

## 3. Buckets

Create the two buckets, both **private** (no public read). Then:

- **Masters**: turn on **versioning**. Masters are never replaced, so versioning only costs
  anything if something deletes one by mistake, and then it is the only copy.
- **Masters**: add the CORS rule in [`s3-cors.json`](s3-cors.json), with your admin host in
  `AllowedOrigins`. The admin portal's browser uploads straight to the bucket; without the rule the
  upload fails at the browser. With the AWS CLI:
  `aws s3api put-bucket-cors --bucket <masters> --cors-configuration file://s3-cors.json`
  (add `--endpoint-url https://…` for other providers).
- **Derived**: no CORS rule needed. Players load audio with a plain `<audio>` element.

## 4. The service account, configuration and first release

On your development machine, from the repository:

```sh
deploy/build-release.sh                    # → deploy/out/adventwave-<commit>.tar.gz
scp deploy/out/adventwave-<commit>.tar.gz you@server:
```

On the server:

```sh
sudo useradd --system --home /opt/adventwave --shell /usr/sbin/nologin adventwave
sudo mkdir -p /opt/adventwave/releases /etc/adventwave

tar -xzf adventwave-<commit>.tar.gz adventwave-<commit>/deploy     # just the deploy files, for now
cd adventwave-<commit>/deploy

sudo install -m 640 -o root -g adventwave gateway.env.example /etc/adventwave/gateway.env
sudo nano /etc/adventwave/gateway.env      # fill in every <...>; the file says how
sudo install -m 644 adventwave-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable adventwave-gateway

sudo ./install-release.sh ~/adventwave-<commit>.tar.gz
```

`install-release.sh` waits for the gateway to report healthy. If it does not, the reason is in
`journalctl -u adventwave-gateway -n 100`. The usual one is a setting still at its development value:
the gateway refuses to start then and lists every such setting.

## 5. HTTPS

```sh
sudo cp /opt/adventwave/current/deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/listen.example.org/<your listener host>/; s/admin.example.org/<your admin host>/' /etc/caddy/Caddyfile
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy
sudo systemctl reload caddy
```

Caddy gets certificates from Let's Encrypt on the first request to each host, once DNS points at the
server and ports 80 and 443 are open.

## 6. First sign-in and clearing the development data

1. Open `https://<admin host>`, sign in with `ADVENTWAVE_ADMIN_BOOTSTRAP_EMAIL` and its password, and
   change the password when asked.
2. Remove the two `ADVENTWAVE_ADMIN_BOOTSTRAP_*` lines from `/etc/adventwave/gateway.env`. The
   account exists now, and the password should not stay in a file.
3. Take the development seed data out of public view:

   ```sh
   cd /opt/adventwave/current/deploy && sudo -u adventwave ./first-deploy.sh
   ```

   This revokes the placeholder licence (which withdraws all 36 reference recordings), hides the
   seed's curated playlists, and deletes the three demo listener accounts. It ends by printing
   counts. `published_items` should be `0`.
4. Add the first church, its licence, its artists and its recordings in the admin portal. Each
   recording is uploaded, transcoded on this server, and published by an editor.

## 7. Backups

```sh
sudo install -d -o postgres -g postgres -m 700 /var/backups/adventwave
sudo install -m 644 /opt/adventwave/current/deploy/backup/adventwave-backup.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now adventwave-backup.timer
sudo systemctl start adventwave-backup && ls -lh /var/backups/adventwave      # one now, to be sure
```

It keeps 14 nightly dumps. They are on the same disk as the database, so **copy them off the
server** too, for example with `rclone` or `aws s3 sync` to a third bucket under a different
account. Audio needs no backup here: it is in the buckets, and masters are versioned.

To restore: [`backup/adventwave-backup.sh`](backup/adventwave-backup.sh) has the commands at the top.

## Releasing again

```sh
deploy/build-release.sh && scp deploy/out/adventwave-<commit>.tar.gz you@server:
ssh you@server 'sudo systemctl start adventwave-backup && sudo /opt/adventwave/current/deploy/install-release.sh ~/adventwave-<commit>.tar.gz'
```

The backup comes first because the new release may migrate the database when it starts. Listeners
see a few seconds of errors while the gateway restarts. The five newest releases stay under
`/opt/adventwave/releases`, and rolling back is `ln -sfn` to the previous one plus a restart.
That only works while no migration has run since, because a migrated schema does not go back by
itself.

## Checking on it

| What | How |
|---|---|
| Gateway log | `journalctl -u adventwave-gateway -f` |
| Health | `curl -s 127.0.0.1:8080/actuator/health` (on the server; not exposed publicly) |
| Transcodes | the log lines starting `transcode <id>:`; a failed one says which stage and why |
| Caddy | `journalctl -u caddy` and `/var/log/caddy/adventwave.log` |
| Backups | `systemctl list-timers adventwave-backup`, `ls -lh /var/backups/adventwave` |
| Disk | `df -h /var/lib/adventwave` — transcode staging, emptied after every job |

## Settings worth knowing

All of them are in `/etc/adventwave/gateway.env`; restart the gateway after a change.

- `SERVER_FORWARD_HEADERS_STRATEGY=native` lets the gateway see the listener's address behind
  Caddy. The per-address limits on sign-in and password reset depend on it; without it every
  request comes from 127.0.0.1 and one listener's typos lock out everyone.
- `ADVENTWAVE_LISTENER_TOKEN_TTL` (default `30d`) is how long a listener stays signed in.
- `-Xmx1g` in the systemd unit is the gateway's memory ceiling. Raise it on a larger server.
- Changing `ADVENTWAVE_LISTENER_TOKEN_SECRET` or `ADVENTWAVE_ADMIN_TOKEN_SECRET` signs everyone out.
  Changing `ADVENTWAVE_SIGNING_SECRET` breaks only playback links already handed out, which last
  minutes.
