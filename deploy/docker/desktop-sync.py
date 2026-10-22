"""Keeps $AW_HOME/downloads at the newest desktop release. Runs in the `downloads` service.

The desktop installers (DESKTOP/) are built on GitHub's runners — the only place with Windows
and macOS machines — and attached to a `desktop-v*` release by
.github/workflows/desktop-release.yml. This copies each new release onto this server, which is
where listeners download from (https://<app host>/downloads/, the website's /download page) and
where installed apps look for updates (DESKTOP/electron-builder.yml).

The server pulls; CI holds no key to it. Every file is checked against the digest GitHub
publishes before it replaces anything, and the update feeds (latest*.yml) are written last, so an
app never reads a feed that points at a file not here yet.

    ./aw exec downloads python /desktop-sync.py once      # check now
"""
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.request

REPO = os.environ.get('DESKTOP_REPO', 'Omwansam/advent-wave')
TAG_PREFIX = 'desktop-v'
EVERY = int(os.environ.get('DESKTOP_SYNC_EVERY', '900'))
ROOT = '/downloads'
STATE = os.path.join(ROOT, 'release.json')
WANTED = {
    'AdventWave-Setup.exe', 'AdventWave-Setup.exe.blockmap',
    'AdventWave.dmg', 'AdventWave.dmg.blockmap', 'AdventWave.zip', 'AdventWave.zip.blockmap',
    'AdventWave.AppImage', 'AdventWave.deb',
    'latest.yml', 'latest-mac.yml', 'latest-linux.yml',
}
HEADERS = {'Accept': 'application/vnd.github+json', 'User-Agent': 'adventwave-desktop-sync'}


def log(message):
    print(f'{time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())} {message}', flush=True)


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return json.load(r)


def newest_release():
    """The newest published desktop release; the repository may release other things too."""
    for release in get_json(f'https://api.github.com/repos/{REPO}/releases?per_page=30'):
        if release['tag_name'].startswith(TAG_PREFIX) and not release['draft'] and not release['prerelease']:
            return release
    return None


def current_tag():
    try:
        with open(STATE) as f:
            return json.load(f).get('tag')
    except (OSError, ValueError):
        return None


def download(asset, dest):
    """Streams one asset to `dest`, checking it against GitHub's digest (or at least its size)."""
    request = urllib.request.Request(asset['browser_download_url'], headers={'User-Agent': HEADERS['User-Agent']})
    digest = hashlib.sha256()
    with urllib.request.urlopen(request, timeout=300) as r, open(dest, 'wb') as out:
        while chunk := r.read(1 << 20):
            digest.update(chunk)
            out.write(chunk)
    if os.path.getsize(dest) != asset['size']:
        raise ValueError(f'{asset["name"]}: {os.path.getsize(dest)} bytes, expected {asset["size"]}')
    expected = asset.get('digest') or ''
    if expected.startswith('sha256:') and expected[7:] != digest.hexdigest():
        raise ValueError(f'{asset["name"]}: sha256 does not match the release')


def sync():
    release = newest_release()
    if release is None:
        log('no desktop release yet')
        return
    tag = release['tag_name']
    if tag == current_tag():
        return
    assets = [a for a in release['assets'] if a['name'] in WANTED]
    if not assets:
        log(f'{tag}: no installers attached yet')
        return

    incoming = os.path.join(ROOT, '.incoming')
    shutil.rmtree(incoming, ignore_errors=True)
    os.makedirs(incoming)
    log(f'{tag}: downloading {len(assets)} files')
    for asset in assets:
        download(asset, os.path.join(incoming, asset['name']))

    # Installers first, update feeds last: an app reading a feed always finds its file.
    names = sorted((a['name'] for a in assets), key=lambda n: n.endswith('.yml'))
    for name in names:
        os.replace(os.path.join(incoming, name), os.path.join(ROOT, name))
    shutil.rmtree(incoming, ignore_errors=True)

    state = {
        'tag': tag,
        'version': tag[len(TAG_PREFIX):],
        'publishedAt': release.get('published_at'),
        'files': {a['name']: a['size'] for a in assets},
    }
    with open(STATE + '.partial', 'w') as f:
        json.dump(state, f)
    os.replace(STATE + '.partial', STATE)
    log(f'{tag}: now serving {", ".join(names)}')


def main():
    os.makedirs(ROOT, exist_ok=True)
    if sys.argv[1:] == ['once']:
        sync()
        return
    while True:
        try:
            sync()
        except Exception as error:  # A failed check is retried next round; the old files stay.
            log(f'sync failed: {error}')
        time.sleep(EVERY)


if __name__ == '__main__':
    main()
