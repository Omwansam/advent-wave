package org.adventwave.catalog.search;

import java.util.Locale;
import java.util.Set;

public final class SearchRanking {
    public static final int NO_MATCH = -1;
    public static final int KENYA_BOOST = 2500;
    private static final Set<String> KENYA_TERMS = Set.of("kenya", "kisumu", "nairobi", "mombasa", "swahili", "cosacow", "eldoret", "nakuru");

    private SearchRanking() {
    }

    public static int matchScore(String text, String query) {
        if (query != null && text != null) {
            String s = text.toLowerCase(Locale.ROOT);
            String s1 = query.toLowerCase(Locale.ROOT).trim();
            if (s1.isEmpty()) {
                return -1;
            } else if (s.equals(s1)) {
                return 10000;
            } else if (s.startsWith(s1)) {
                return 8000 + Math.min(500, Math.max(0, 200 - s.length()));
            } else {
                int i = s.indexOf(s1);
                return i >= 0 ? 6000 - Math.min(i, 500) : -1;
            }
        } else {
            return -1;
        }
    }

    public static int bestTrackScore(String title, String artist, String album, String query) {
        return Math.max(matchScore(title, query), Math.max(matchScore(artist, query), album == null ? -1 : matchScore(album, query)));
    }

    public static boolean isKenyaQuery(String query) {
        if (query == null) {
            return false;
        } else {
            String s = query.toLowerCase(Locale.ROOT);
            return KENYA_TERMS.stream().anyMatch(s::contains);
        }
    }
}
