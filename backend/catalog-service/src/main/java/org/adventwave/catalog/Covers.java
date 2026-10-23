package org.adventwave.catalog;

import java.util.Map;
import java.util.UUID;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.Ensemble;

/**
 * Covers for profiles (RFC 0009). A profile without its own picture gets a gospel photo for its
 * kind — a church building, a choir, raised hands for a youth choir, an open Bible for a preacher,
 * a microphone for a ministry — always the same one for the same profile. The photos are the web
 * app's (advent-wave/public/covers/, credited there); an editor's cover replaces them.
 */
public final class Covers {
    /** How many photos each set has: {@code /covers/<set>-1.jpg} to {@code <set>-<n>.jpg}. */
    private static final Map<String, Integer> SETS = Map.of(
        "church", 5, "choir", 7, "youth", 4, "children", 1, "group", 4, "preacher", 3, "ministry", 2
    );

    private Covers() {
    }

    /** The profile's own cover, or its placeholder; always absolute. */
    public static String artist(Artist artist, String coverBaseUrl) {
        if (artist.getCoverUrl() != null && !artist.getCoverUrl().isBlank()) {
            return absolute(artist.getCoverUrl(), coverBaseUrl);
        }

        String set = placeholderSet(artist.getKind(), artist.getEnsemble());
        int n = (int)Long.remainderUnsigned(mix(artist.getId()), SETS.get(set)) + 1;
        return base(coverBaseUrl) + "/covers/" + set + "-" + n + ".jpg";
    }

    /** A stored cover: a path starting with "/" is the web app's; anything else is used as it is. */
    public static String absolute(String url, String coverBaseUrl) {
        if (url == null || url.isBlank()) {
            return null;
        }

        return url.startsWith("/") && !url.startsWith("//") ? base(coverBaseUrl) + url : url;
    }

    static String placeholderSet(ArtistKind kind, Ensemble ensemble) {
        if (kind == null) {
            return "group";
        }

        return switch (kind) {
            case CHURCH -> "church";
            case CHOIR -> ensemble == Ensemble.YOUTH ? "youth" : ensemble == Ensemble.CHILDREN ? "children" : "choir";
            case PREACHER -> "preacher";
            case MINISTRY -> "ministry";
            case GROUP, SOLOIST -> "group";
        };
    }

    /** A well-spread number from the id (SplitMix64's finaliser), so neighbours on a page rarely share a photo. */
    private static long mix(UUID id) {
        long h = id.getMostSignificantBits() ^ Long.rotateLeft(id.getLeastSignificantBits(), 29);
        h = (h ^ (h >>> 30)) * 0xbf58476d1ce4e5b9L;
        h = (h ^ (h >>> 27)) * 0x94d049bb133111ebL;
        return h ^ (h >>> 31);
    }

    private static String base(String coverBaseUrl) {
        String s = coverBaseUrl == null ? "" : coverBaseUrl;
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }
}
