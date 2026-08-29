package org.adventwave.contracts.redis;

import java.time.Duration;

public final class RedisKeys {
    public static final Duration PLAYER_TTL = Duration.ofHours(24L);
    public static final Duration HOME_TTL = Duration.ofMinutes(5L);
    public static final Duration RATELIMIT_TTL = Duration.ofMinutes(1L);
    public static final Duration FRIEND_FEED_TTL = Duration.ofMinutes(10L);
    public static final Duration MEDIA_TTL = Duration.ofHours(1L);
    public static final Duration TYPEAHEAD_TTL = Duration.ofMinutes(15L);
    public static final Duration TRENDING_TTL = Duration.ofHours(48L);
    public static final Duration RECO_TTL = Duration.ofHours(6L);
    public static final Duration PLAY_SESSION_TTL = Duration.ofMinutes(15L);

    public static String player(String userId) {
        return "a:player:" + userId;
    }

    public static String home(String segment) {
        return "a:home:" + segment;
    }

    public static String rateLimit(String userId, String route) {
        return "a:ratelimit:" + userId + ":" + route;
    }

    public static String friendFeed(String userId) {
        return "a:friendfeed:" + userId;
    }

    public static String media(String mediaItemId) {
        return "b:media:" + mediaItemId;
    }

    public static String typeahead(String queryPrefix) {
        return "b:typeahead:" + queryPrefix;
    }

    public static String trending(String region, String day) {
        return "c:trending:" + region + ":" + day;
    }

    public static String reco(String userId) {
        return "f:reco:" + userId;
    }

    public static String playSession(String sessionId) {
        return "d:playsession:" + sessionId;
    }

    private RedisKeys() {
    }
}
