package org.adventwave.gateway.assemble;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.contracts.redis.RedisKeys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class HomeSectionCache {
    private static final Logger log = LoggerFactory.getLogger(HomeSectionCache.class);
    private static final TypeReference<List<TrackDto>> TRACKS = new TypeReference<List<TrackDto>>() {};
    private static final TypeReference<List<PlaylistDto>> PLAYLISTS = new TypeReference<List<PlaylistDto>>() {};
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public HomeSectionCache(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public List<TrackDto> trending(Supplier<List<TrackDto>> loader) {
        return this.cached(RedisKeys.home("trending"), TRACKS, loader);
    }

    public List<TrackDto> sermons(Supplier<List<TrackDto>> loader) {
        return this.cached(RedisKeys.home("sermons"), TRACKS, loader);
    }

    public List<PlaylistDto> sabbathWorship(Supplier<List<PlaylistDto>> loader) {
        return this.cached(RedisKeys.home("sabbath-worship"), PLAYLISTS, loader);
    }

    public void invalidateAll() {
        try {
            this.redis.delete(List.of(RedisKeys.home("trending"), RedisKeys.home("sermons"), RedisKeys.home("sabbath-worship")));
        } catch (Exception exception) {
            log.warn("could not invalidate home sections", exception);
        }
    }

    private <T> T cached(String key, TypeReference<T> type, Supplier<T> loader) {
        try {
            String s = (String)this.redis.opsForValue().get(key);
            if (s != null) {
                return (T)this.objectMapper.readValue(s, type);
            }
        } catch (Exception exception1) {
            log.warn("home section cache read failed for {}", key, exception1);
        }

        T t = loader.get();

        try {
            this.redis.opsForValue().set(key, this.objectMapper.writeValueAsString(t), this.jittered(RedisKeys.HOME_TTL));
        } catch (Exception exception) {
            log.warn("home section cache write failed for {}", key, exception);
        }

        return t;
    }

    private Duration jittered(Duration base) {
        long i = base.toMillis();
        long j = i / 5L;
        return Duration.ofMillis(i - j + ThreadLocalRandom.current().nextLong(2L * j));
    }
}
