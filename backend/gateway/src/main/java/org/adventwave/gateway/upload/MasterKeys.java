package org.adventwave.gateway.upload;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The master key layout from contracts/audio/transcode.md: {@code masters/{media_item_id}/original.{ext}}.
 * One master per item, never replaced, never served.
 */
public final class MasterKeys {
    /**
     * Containers the transcode tool reads. Lossless first; the rest are accepted and flagged
     * {@code lossy_master} by the worker. Video containers keep only their audio stream.
     */
    public static final List<String> EXTENSIONS = List.of(
        "wav", "flac", "aif", "aiff", "mp3", "m4a", "aac", "ogg", "opus", "mp4", "mov", "webm");

    private static final Pattern KEY = Pattern.compile("^masters/([0-9a-f-]{36})/original\\.([a-z0-9]+)$");

    private MasterKeys() {
    }

    /** The filename's extension, lower-cased, if it is one the tool reads; otherwise empty. */
    public static String extensionOf(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return "";
        String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        return EXTENSIONS.contains(ext) ? ext : "";
    }

    public static String keyFor(UUID mediaItemId, String extension) {
        return "masters/" + mediaItemId + "/original." + extension;
    }

    /** Whether {@code key} is a well-formed master key for this item with an accepted extension. */
    public static boolean isKeyFor(UUID mediaItemId, String key) {
        var m = KEY.matcher(key == null ? "" : key);
        return m.matches() && m.group(1).equals(mediaItemId.toString()) && EXTENSIONS.contains(m.group(2));
    }

    public static String extensionOfKey(String key) {
        return key.substring(key.lastIndexOf('.') + 1);
    }
}
