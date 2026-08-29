package org.adventwave.gateway.events;

import java.util.UUID;
import org.adventwave.contracts.redis.RedisKeys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RateLimiter {
    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);
    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public boolean allow(UUID userId, String route, int limitPerWindow) {
        String s = RedisKeys.rateLimit(userId.toString(), route);

        try {
            Long olong = this.redis.opsForValue().increment(s);
            if (olong == null) {
                return true;
            } else {
                if (olong == 1L) {
                    this.redis.expire(s, RedisKeys.RATELIMIT_TTL);
                }

                return olong <= limitPerWindow;
            }
        } catch (Exception exception) {
            log.warn("rate limiter unavailable for {} on {}; allowing request", new Object[]{userId, route, exception});
            return true;
        }
    }
}
