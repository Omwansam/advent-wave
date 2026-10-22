# AdventWave on a shared Docker host

The variant of [`../README.md`](../README.md) for a server where everything runs in Docker and an
existing edge proxy already owns ports 80 and 443 — as on `fibi` (2.24.114.80), where the FIBI
stack's nginx (`fibi-proxy-1`) fronts several sites. AdventWave publishes nothing to the internet:
its `web`, `site` and `gateway` containers join the proxy's network (`fibi_internal`) as
`adventwave-web`, `adventwave-site` and `adventwave-gateway`, and the proxy includes AdventWave's
own vhost files.

```
Cloudflare ─► fibi-proxy-1 (80/443, Let's Encrypt via fibi-certbot-1)
                 │  adventwave.draftbitlabs.tech        /v1/* → adventwave-gateway:8080
                 │                                       /     → adventwave-web:80
                 │  admin.draftbitlabs.tech             /v1/* → adventwave-gateway:8080
                 │                                       /     → adventwave-web:81
                 │  <website host>  (AW_SITE_HOST)      /v1/site    → adventwave-gateway:8080
                 │                                       /downloads/ → adventwave-web:80
                 │                                       /           → adventwave-site:80
              compose project "adventwave": gateway, web, site, postgres, redis, backup, downloads
```

## Layout on the server

| Path | What |
|---|---|
| `/srv/adventtwave/app` | this repository, `main` |
| `/srv/adventtwave/adventwave.env` | settings and secrets, mode 600, written by `install.sh` on the first run |
| `/srv/adventtwave/vhosts` | the proxy's AdventWave vhosts, rendered from `deploy/docker/vhosts/*.template` |
| `/srv/adventtwave/backups` | nightly database dumps, the newest 14 |

`deploy/docker/aw` is `docker compose` for this stack from anywhere: `./aw ps`,
`./aw logs -f gateway`, `./aw restart gateway`.

## First install

```sh
git clone https://github.com/Omwansam/advent-wave.git /srv/adventtwave/app
cd /srv/adventtwave/app
deploy/docker/install.sh --app-host adventwave.draftbitlabs.tech \
                         --admin-host admin.draftbitlabs.tech --admin-email you@example.org \
                         --site-host <website host>      # optional; see "The website" below
```

It writes `adventwave.env` with fresh secrets, builds the images, starts the stack, waits for the
gateway to report healthy, and renders the port-80 vhost.

**Connect the proxy** (once). In `/opt/fibi/FIBI`, beside the other tenants' lines:

- `docker-compose.yml`, proxy volumes:
  `- /srv/adventtwave/vhosts:/etc/nginx/conf.d/vhosts-adventwave:ro`
- `deploy/nginx.conf`, end of the `http` block:
  `include /etc/nginx/conf.d/vhosts-adventwave/*.conf;  # AdventWave — /srv/adventtwave`

Copy both files to `*.bak-pre-adventwave-<date>` first, then `docker compose up -d proxy` (a couple
of seconds without any site while the container is recreated). FIBI's entrypoint runs `nginx -t`
before it starts nginx, and ignores any command given to it — so `docker compose run proxy nginx -t`
does not test anything, it starts a second nginx. If the proxy does not come back (`docker ps`
shows it Restarting), restore the two `.bak` files and `docker compose up -d proxy` again.

**Unknown hostnames are refused** (since 2026-10-21). fibi's `nginx.conf` has a catch-all
`default_server` on 80 and 443 (`return 444`, `ssl_reject_handshake on`). Before it, a hostname no
vhost claimed fell to FIBI's first server block, which answers with a *permanent* redirect to
fibicommunity.org. A browser that asked for `adventwave.draftbitlabs.tech` in the minutes between the
DNS record and this vhost cached that 301, and kept going to FIBI afterwards. Clear the browser's
cached files (or use a private window) if a new site does that. Backup of the file before the
change: `deploy/nginx.conf.bak-pre-catchall-*`.

**DNS.** In Cloudflare, for `draftbitlabs.tech`: two `A` records, `adventwave` and `admin`, to
`2.24.114.80`, proxied. Keep both one level below the domain: Cloudflare's free certificate covers
`*.draftbitlabs.tech`, not a name like `admin.adventwave.draftbitlabs.tech`.

**HTTPS**, once both names resolve: `deploy/docker/enable-https.sh`. It issues one certificate for
both through the proxy's certbot, installs the HTTPS vhost after the proxy accepts it, and reloads.

**Clear the development data**, before anyone else signs in: `deploy/docker/first-deploy.sh`
(asks for the bootstrap admin's email and password —
`grep BOOTSTRAP /srv/adventtwave/adventwave.env`). Then sign in to the admin portal, change the
password, and delete the two `ADVENTWAVE_ADMIN_BOOTSTRAP_*` lines from `adventwave.env`.

## Updating

```sh
cd /srv/adventtwave/app && deploy/docker/install.sh
```

Pulls `main`, rebuilds, restarts what changed and re-renders the vhosts. Flyway migrates the
database on start, so take a dump first when a release adds a migration:
`deploy/docker/aw exec backup sh /backup-loop.sh once`.

## The website

The official website (`WEBSITE/advent-net`, the Flow Wave site) is the `site` container: its own
image (`Dockerfile.site`, nginx serving the static build) on a host of its own. The site asks its
own origin for everything, and its vhost (`vhosts/30-adventwave-site-https.conf.template`) passes on
only what it reads:

- `/v1/site` → the gateway: the live catalogue, built once and cached in this stack's Redis
  (`a:site:showcase`, RFC 0008). Nothing else under `/v1` is reachable on this host.
- `/downloads/` → the `web` container: `release.json` and the installers, as on the app host.
- everything else → the site. Its "Open AdventWave" links and download buttons point at the app
  host, which is baked into the build from `AW_APP_HOST`.

**Add it to a running install**, in this order. The proxy refuses a hostname that no vhost claims,
so the port-80 vhost has to exist before the DNS record does:

1. `deploy/docker/install.sh --site-host <website host>` — stores `AW_SITE_HOST` in
   `adventwave.env`, builds and starts `site`, and adds the host to the port-80 vhost. The gateway
   is rebuilt with the same run, which is what brings `GET /v1/site`.
2. In Cloudflare, an `A` record for the website host to `2.24.114.80`, proxied. One level below
   the domain (`<name>.draftbitlabs.tech`), for the same certificate reason as the other two.
3. `deploy/docker/enable-https.sh` — reissues the `adventwave` certificate with the third name
   and installs the site's HTTPS vhost. If the proxy rejected that file, the script removes it again
   and leaves the app and admin hosts as they were.

Afterwards `install.sh` rebuilds the site with everything else. To check it from the server:
`curl -sk --resolve <website host>:443:127.0.0.1 https://<website host>/v1/site | head -c 200`.

## Email and object storage, later

`install.sh` fills both with values that let the gateway start but cannot work
(`*.not-configured.invalid`): sign-up, sign-in and listening work; reset and verification emails
and new uploads fail, with the reason in the gateway's log. When you have them, replace those lines
in `adventwave.env` (the template, with explanations, is
[`adventwave.env.example`](adventwave.env.example); buckets and their CORS rule are in
[`../README.md`](../README.md) §3, with your admin host in `AllowedOrigins`) and rerun `install.sh`.

### Cloudflare R2

Checked against Cloudflare's R2 docs in October 2026.

1. **Enable R2.** Cloudflare dashboard → **R2 object storage**. Cloudflare asks for a payment method
   even if you stay within the free allowance.
2. **Create two buckets.** Select **Create bucket** twice: `adventwave-masters` and
   `adventwave-derived`. Names may only use lowercase letters, digits and hyphens. Leave the
   location on *Automatic* and choose no jurisdiction, because a jurisdiction changes the endpoint
   below. Leave both buckets **private**: no public access and no `r2.dev` or custom domain. Players
   get time-limited signed links instead.
3. **Allow browser uploads to the masters bucket.** `adventwave-masters` → **Settings** →
   **CORS Policy** → **Add CORS policy** → **JSON** tab. R2 takes the rule list only, without
   the `CORSRules` wrapper in `../s3-cors.json`:
   ```json
   [{"AllowedOrigins":["https://admin.draftbitlabs.tech"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
   ```
   The derived bucket needs no CORS rule: players use a plain `<audio>` element.
4. **Protect the masters** (optional, recommended). R2 has no object versioning. Instead,
   `adventwave-masters` → **Settings** → **Bucket lock rules** → **Add rule**: prefix `masters/`,
   no expiry. AdventWave never deletes or replaces a master, so the lock costs nothing, and it stops
   anyone deleting the only original by mistake. Do **not** lock `adventwave-derived`: a
   re-transcode rewrites those files.
5. **Create a key.** **R2 object storage** → **Overview** → *Account Details* → **API Tokens** →
   **Manage** → **Create Account API token**, permission **Object Read & Write**, limited to the two
   buckets. Copy the **Access Key ID** and **Secret Access Key**; the secret is shown once. Your
   account ID is on the same page.
6. **Put them in `/srv/adventtwave/adventwave.env`**, replacing the `not-configured` lines, then run
   `deploy/docker/install.sh`:
   ```
   ADVENTWAVE_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ADVENTWAVE_S3_REGION=auto
   ADVENTWAVE_S3_ACCESS_KEY=<Access Key ID>
   ADVENTWAVE_S3_SECRET_KEY=<Secret Access Key>
   ADVENTWAVE_S3_MASTERS_BUCKET=adventwave-masters
   ADVENTWAVE_S3_DERIVED_BUCKET=adventwave-derived
   ADVENTWAVE_S3_PATH_STYLE=false
   ```

Recordings transcoded on a development machine are not in R2 and not in the server's database.
They are uploaded again through the admin portal, or by a transfer script, and the server
transcodes them itself.

## Backups

The `backup` service dumps the database every 24 hours into `/srv/adventtwave/backups` and keeps
14. They are on the same disk as the database: copy them elsewhere too. Restoring is at the top of
[`backup-loop.sh`](backup-loop.sh).





Still to do: sign in to the admin portal, change the temporary admin password, then delete the two ADVENTWAVE_ADMIN_BOOTSTRAP_* lines from /srv/adventtwave/adventwave.env. My import used them, and they shouldn't stay in that file.

## Desktop app downloads

The desktop installers (`DESKTOP/`) are served from this server at
`https://<app host>/downloads/`, by the `web` container from `$AW_HOME/downloads`. The website's
`/download` page links there, and installed apps check `downloads/latest*.yml` for updates.

GitHub's runners build them on a `desktop-v*` tag (`.github/workflows/desktop-release.yml`).
The `downloads` service (`desktop-sync.py`) checks the repository's releases every 15 minutes,
downloads a new one, verifies every file against GitHub's digest, and swaps it in — installers
first, update feeds last. Until the first release arrives, `/download` says the app is on its
way. To check right now:

    ./aw exec downloads python /desktop-sync.py once
    ./aw logs --tail 20 downloads
