package org.adventwave.gateway.assemble;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;
import org.adventwave.contracts.api.SiteDto;
import org.adventwave.contracts.redis.RedisKeys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * The public website's showcase (RFC 0008), assembled once and kept in Redis: every visitor
 * sees the same thing, and it changes only when the catalogue does. Degrades like
 * {@link HomeSectionCache} — a Redis failure is a cache miss, slower and still correct.
 */
@Component
public class SiteCache {
    private static final Logger log = LoggerFactory.getLogger(SiteCache.class);
    private static final String SHOWCASE = RedisKeys.site("showcase");
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public SiteCache(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public SiteDto showcase(Supplier<SiteDto> loader) {
        try {
            String s = this.redis.opsForValue().get(SHOWCASE);
            if (s != null) {
                return this.objectMapper.readValue(s, SiteDto.class);
            }
        } catch (Exception exception) {
            log.warn("site cache read failed", exception);
        }

        SiteDto site = loader.get();

        try {
            this.redis.opsForValue().set(SHOWCASE, this.objectMapper.writeValueAsString(site), this.jittered(RedisKeys.SITE_TTL));
        } catch (Exception exception) {
            log.warn("site cache write failed", exception);
        }

        return site;
    }

    public void invalidate() {
        try {
            this.redis.delete(SHOWCASE);
        } catch (Exception exception) {
            log.warn("could not invalidate the site showcase", exception);
        }
    }

    private Duration jittered(Duration base) {
        long i = base.toMillis();
        long j = i / 5L;
        return Duration.ofMillis(i - j + ThreadLocalRandom.current().nextLong(2L * j));
    }
}
