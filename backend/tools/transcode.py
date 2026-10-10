#!/usr/bin/env python3
"""Transcode a master into the audio ladder: workstream D's worker steps as a local CLI.

The contract is contracts/audio/transcode.md; the message written is the `completed` shape in
contracts/kafka/audio.transcode.v1/schema.json. One subcommand per producer on that seam:

  ingest   the upload service's part: copy a contributor's file to masters/{id}/original.{ext}.
           A video container (a phone recording, a YouTube download) loses its picture, never
           its sound: the first audio stream is copied out bit-exact, and that is checked.
  run      the worker's part: probe, encode + measure in one ffmpeg pass, verify every output,
           flag silence, swap the outputs into derived/{id}/, write the message. --deliver
           appends the message to the outbox table, the local stand-in for Kafka, where the
           gateway's dispatcher hands it to TranscodeCompletedHandler.

A directory stands in for the two buckets:

  {media-root}/masters/{id}/original.{ext}   never served
  {media-root}/derived/{id}/{profile}.m4a    served (locally: the gateway's /media-storage)
  {media-root}/work/{id}/                    staging, ffmpeg log, message.json; never served

Needs ffmpeg and ffprobe. --deliver also needs psql, connected through the standard libpq
variables (PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD); this script never reads a password.

Usage:
  tools/transcode.py ingest SOURCE --media-item-id ID
  tools/transcode.py run --media-item-id ID --media-type song --master-key KEY [--deliver]
"""
import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

TOPIC = "audio.transcode.v1"

# Every asset gets one known rate, resampled with soxr; a 44.1 kHz master passes through
# untouched. Verify checks this constant, not the master's probed rate.
TARGET_SAMPLE_RATE = 44100

# A truncated encode that is still a valid file is the failure most likely to reach a listener.
DURATION_TOLERANCE_S = 0.100

# Flag, never trim (plan §11.7): church recordings open with room tone and a cappella intros.
# Quieter than -50 dBFS for 3 s or more at either end goes to a human in the admin portal:
# three seconds of dead air after pressing play is long enough for a listener to think the
# track is broken.
SILENCE_NOISE_DB = -50
SILENCE_MIN_S = 3.0

LOSSY_CODECS = {"aac", "mp3", "mp2", "vorbis", "opus", "ac3", "eac3", "wmav2"}

# BitrateLadder's ladders with RFC-1's interim substitution: there is no libfdk_aac build, so
# aac_64 stands in for aac_24_hev2. The gateway resolves a request for aac_24_hev2 to the
# lowest profile available, which is then aac_64.
LADDERS = {
    "song": ["aac_64", "aac_96", "aac_160", "aac_320"],
    "sermon": ["aac_64", "aac_128"],
    "podcast": ["aac_64", "aac_128"],
}

# Container for an audio stream copied out of a video file; Matroska holds anything unlisted.
MASTER_CONTAINERS = {"aac": "m4a", "alac": "m4a", "mp3": "mp3", "flac": "flac", "opus": "ogg", "vorbis": "ogg"}


class StageError(Exception):
    """A job failure, shaped like the `error` object of a failed message."""

    def __init__(self, code, stage, message):
        super().__init__(message)
        self.code = code
        self.stage = stage


def log(message):
    print(f"transcode: {message}", file=sys.stderr)


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def bitrate_kbps(profile):
    return int(profile.split("_")[1])


def probe(path):
    """The first audio stream's codec, channels, rate and duration, and whether video rides along."""
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
                         capture_output=True, text=True)
    if out.returncode != 0:
        # the worker's own paths mean nothing in the admin portal, where this message is shown
        raise StageError("probe_failed", "probe", f"ffprobe {path.name}: {out.stderr.strip().replace(str(path), path.name)}")
    info = json.loads(out.stdout)
    streams = info.get("streams", [])
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if audio is None:
        raise StageError("probe_failed", "probe", f"{path.name} has no audio stream")
    return {
        "codec": audio["codec_name"],
        "profile": audio.get("profile"),
        "channels": int(audio["channels"]),
        "sample_rate": int(audio["sample_rate"]),
        "duration": float(audio.get("duration") or info["format"]["duration"]),
        # cover art is a one-frame "video" stream; it does not make a file a video
        "has_video": any(s.get("codec_type") == "video" and not s.get("disposition", {}).get("attached_pic")
                         for s in streams),
    }


def audio_packet_md5(path):
    """MD5 of the first audio stream's packets as stored. Equal hashes mean a bit-exact copy."""
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-c", "copy", "-f", "md5", "-"],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def ingest(args):
    source, root = Path(args.source), Path(args.media_root)
    try:
        src = probe(source)
    except StageError as e:
        log(str(e))
        return 1
    if src["has_video"]:
        ext = "wav" if src["codec"].startswith("pcm_") else MASTER_CONTAINERS.get(src["codec"], "mka")
    else:
        ext = source.suffix.lower().lstrip(".") or "bin"
    key = f"masters/{args.media_item_id}/original.{ext}"
    dest = root / key

    # Masters are never replaced: a re-run with the same audio is a no-op, different audio is
    # refused, whatever extension either one has.
    existing = sorted((root / "masters" / args.media_item_id).glob("original.*"))
    if existing:
        stored = f"masters/{args.media_item_id}/{existing[0].name}"
        if audio_packet_md5(existing[0]) != audio_packet_md5(source):
            log(f"{stored} already holds different audio; masters are never replaced")
            return 1
        log(f"{stored} already holds this audio")
        print(stored)
        return 0

    dest.parent.mkdir(parents=True, exist_ok=True)
    partial = dest.with_name(".partial-" + dest.name)
    if src["has_video"]:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-map", "0:a:0", "-c", "copy", str(partial)],
                       check=True)
        if audio_packet_md5(partial) != audio_packet_md5(source):
            partial.unlink()
            log("the audio stream changed while being copied out of its container")
            return 1
        log(f"{source.name}: video stream dropped, {src['codec']} audio copied bit-exact")
    else:
        shutil.copyfile(source, partial)
    partial.rename(dest)
    log(f"master stored at {key} ({dest.stat().st_size} bytes)")
    print(key)
    return 0


def loudness_summary(stderr):
    """Integrated loudness and true peak from ebur128's closing summary."""
    at = stderr.rfind("Summary:")
    if at < 0:
        raise StageError("encode_failed", "encode", "ebur128 printed no loudness summary")
    integrated = re.search(r"I:\s+(-?[\d.]+) LUFS", stderr[at:])
    peak = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", stderr[at:])
    if not integrated or not peak:
        raise StageError("encode_failed", "encode", "ebur128 summary is missing loudness or true peak")
    if peak.group(1) == "-inf":
        raise StageError("verification_failed", "verify", "the master is digital silence")
    return float(integrated.group(1)), float(peak.group(1))


def silence_flags(stderr, duration):
    """Review flags from silencedetect, which reports only runs of SILENCE_MIN_S or longer."""
    starts = [float(s) for s in re.findall(r"silence_start: (-?[\d.]+)", stderr)]
    ends = [float(e) for e in re.findall(r"silence_end: (-?[\d.]+)", stderr)]
    flags = []
    if starts and starts[0] <= 0.05:
        flags.append("long_leading_silence")
    # a run still open at end of stream has a start and no end
    if starts and (len(ends) < len(starts) or ends[-1] >= duration - 0.05):
        flags.append("long_trailing_silence")
    return flags


def transcode(root, mid, media_type, master_key, work, event_id):
    master = (root / master_key).resolve()
    if root.resolve() / "masters" not in master.parents:
        raise StageError("probe_failed", "probe", f"{master_key} is not under masters/")
    if not master.is_file():
        raise StageError("probe_failed", "probe", f"no master at {master_key}")

    # 1. probe
    src = probe(master)
    flags = ["lossy_master"] if src["codec"] in LOSSY_CODECS else []
    resampled = src["sample_rate"] != TARGET_SAMPLE_RATE
    log(f"probe: {src['codec']} {src['sample_rate']} Hz, {src['channels']} ch, {src['duration']:.3f} s"
        + (f"; resampling to {TARGET_SAMPLE_RATE} Hz" if resampled else "; no resample needed"))

    # 2. encode + measure in one pass. The master is decoded once; the meter taps it before the
    #    resampler, so loudness describes the master itself and applies to every derivative.
    profiles = LADDERS[media_type]
    staging = work / "staging"
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir(parents=True)
    buildconf = subprocess.run(["ffmpeg", "-hide_banner", "-buildconf"], capture_output=True, text=True).stdout
    resampler = ":resampler=soxr" if "--enable-libsoxr" in buildconf else ""
    graph = ("[0:a]asplit=2[enc][meas];"
             f"[meas]ebur128=peak=true:framelog=verbose,silencedetect=noise={SILENCE_NOISE_DB}dB:d={SILENCE_MIN_S}[m];"
             f"[enc]aresample={TARGET_SAMPLE_RATE}{resampler},asplit={len(profiles)}"
             + "".join(f"[{p}]" for p in profiles))
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", str(master), "-filter_complex", graph]
    for p in profiles:
        cmd += ["-map", f"[{p}]", "-c:a", "aac", "-b:a", f"{bitrate_kbps(p)}k",
                # no source tags or encoder version in the file, so a re-run writes identical bytes
                "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                "-movflags", "+faststart", str(staging / f"{p}.m4a")]
    cmd += ["-map", "[m]", "-f", "null", "-"]
    encode = subprocess.run(cmd, capture_output=True, text=True)
    (work / "ffmpeg.log").write_text(encode.stderr)
    if encode.returncode != 0:
        lines = [line for line in encode.stderr.splitlines() if line.strip()]
        raise StageError("encode_failed", "encode", lines[-1] if lines else f"ffmpeg exited {encode.returncode}")
    loudness, true_peak = loudness_summary(encode.stderr)
    # 4. silence: detection ran in the same pass; nothing is cut
    flags += silence_flags(encode.stderr, src["duration"])
    log(f"measure: {loudness} LUFS integrated, {true_peak} dBTP true peak")

    # 3. verify every output before anything can serve it
    assets, durations = [], {}
    for p in profiles:
        f = staging / f"{p}.m4a"
        try:
            out = probe(f)
        except StageError as e:
            raise StageError("verification_failed", "verify", f"{p}: {e}")
        problems = []
        if out["codec"] != "aac" or out["profile"] != "LC":
            problems.append(f"codec {out['codec']}/{out['profile']}, expected aac/LC")
        if abs(out["duration"] - src["duration"]) > DURATION_TOLERANCE_S:
            problems.append(f"duration {out['duration']:.3f} s against the master's {src['duration']:.3f} s")
        if out["channels"] != src["channels"]:
            problems.append(f"{out['channels']} channels, the master has {src['channels']}")
        if out["sample_rate"] != TARGET_SAMPLE_RATE:
            problems.append(f"{out['sample_rate']} Hz, expected {TARGET_SAMPLE_RATE}")
        if problems:
            raise StageError("verification_failed", "verify", f"{p}: " + "; ".join(problems))
        durations[p] = out["duration"]
        assets.append({
            "profile": p,
            "codec": "aac-lc",
            "bitrate_kbps": bitrate_kbps(p),
            "container": "m4a",
            "sample_rate_hz": out["sample_rate"],
            "channels": out["channels"],
            "storage_key": f"derived/{mid}/{p}.m4a",
            "byte_size": f.stat().st_size,          # read from the file, never bitrate x duration
            "checksum_sha256": sha256(f),
        })
        log(f"verify: {p} ok, {f.stat().st_size} bytes, {out['duration']:.3f} s")

    # 5. upload: swap the verified set in whole, so derived/{id}/ never holds half a ladder
    final = root / "derived" / mid
    previous = work / "previous"
    try:
        final.parent.mkdir(parents=True, exist_ok=True)
        shutil.rmtree(previous, ignore_errors=True)
        if final.exists():
            final.rename(previous)
        try:
            staging.rename(final)
        except OSError:
            if previous.exists():
                previous.rename(final)
            raise
        shutil.rmtree(previous, ignore_errors=True)
    except OSError as e:
        raise StageError("upload_failed", "upload", str(e))

    return {
        "kind": "completed",
        "event_id": event_id,
        "media_item_id": mid,
        "status": "completed",
        "duration_ms": round(durations[profiles[-1]] * 1000),
        "loudness_lufs": loudness,
        "true_peak_dbfs": true_peak,
        "assets": assets,
        "flags": flags,
        "error": None,
        "completed_at": now(),
    }


def deliver(message):
    """Append the message to the outbox, the local stand-in for producing to Kafka."""
    sql = ("INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload)\n"
           "VALUES (:'event_id', 'media_item', :'media_item_id', :'topic', :'payload'::jsonb);\n")
    result = subprocess.run(
        ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1",
         "-v", f"event_id={message['event_id']}",
         "-v", f"media_item_id={message['media_item_id']}",
         "-v", f"topic={TOPIC}",
         "-v", f"payload={json.dumps(message)}"],
        input=sql, text=True)
    if result.returncode != 0:
        log("delivery to the outbox failed; message.json is kept in the work directory")
        return False
    log(f"delivered {message['status']} for {message['media_item_id']} to the outbox (event {message['event_id']})")
    return True


def run(args):
    root, mid = Path(args.media_root), args.media_item_id
    work = root / "work" / mid
    work.mkdir(parents=True, exist_ok=True)
    # One run per item at a time. A worker killed without killing its child (SIGKILL, the OOM
    # killer) leaves that child running, and the restarted worker's re-run must not share its
    # staging directory. It waits here until the orphan finishes or dies. The lock belongs to
    # the open file, so the kernel releases it however the holder exits.
    lock = open(work / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        log("another run of this item is in progress; waiting for it to finish")
        fcntl.flock(lock, fcntl.LOCK_EX)
    event_id = str(uuid.uuid4())
    try:
        message = transcode(root, mid, args.media_type, args.master_key, work, event_id)
    except StageError as e:
        log(f"failed at {e.stage}: {e}")
        message = {
            "kind": "completed",
            "event_id": event_id,
            "media_item_id": mid,
            "status": "failed",
            "assets": [],
            "flags": [],
            "error": {"code": e.code, "message": str(e), "stage": e.stage},
            "completed_at": now(),
        }
    (work / "message.json").write_text(json.dumps(message, indent=2) + "\n")
    print(json.dumps(message, indent=2))
    delivered = deliver(message) if args.deliver else True
    return 0 if message["status"] == "completed" and delivered else 1


def uuid_arg(value):
    return str(uuid.UUID(value))


def main():
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            log(f"{tool} is not on PATH")
            return 2
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--media-root", default=os.environ.get("ADVENTWAVE_MEDIA_ROOT", str(Path.home() / "media")),
                        help="directory standing in for the buckets (default: $ADVENTWAVE_MEDIA_ROOT, else ~/media)")
    common.add_argument("--media-item-id", required=True, type=uuid_arg)
    parser = argparse.ArgumentParser(description="Transcode a master into the audio ladder (contracts/audio/transcode.md).")
    commands = parser.add_subparsers(dest="command", required=True)
    p_ingest = commands.add_parser("ingest", parents=[common], help="store a source file as the item's master")
    p_ingest.add_argument("source")
    p_run = commands.add_parser("run", parents=[common], help="transcode the item's master and write the message")
    p_run.add_argument("--media-type", required=True, choices=sorted(LADDERS))
    p_run.add_argument("--master-key", required=True, help="masters/{id}/original.{ext}, relative to --media-root")
    p_run.add_argument("--deliver", action="store_true", help="append the message to the outbox via psql")
    args = parser.parse_args()
    return ingest(args) if args.command == "ingest" else run(args)


if __name__ == "__main__":
    sys.exit(main())
