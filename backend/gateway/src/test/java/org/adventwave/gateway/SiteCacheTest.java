package org.adventwave.gateway;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.SiteDto;
import org.adventwave.contracts.events.Topics;
import org.adventwave.gateway.assemble.SiteCache;
import org.adventwave.gateway.events.SiteCacheInvalidationHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * RFC 0008: the public site's showcase is built once and served from Redis, and Redis failing
 * only makes it slower. No Spring context and no containers, so it runs anywhere.
 */
class SiteCacheTest {
    private static final String KEY = "a:site:showcase";
    private final ObjectMapper json = JsonMapper.builder().findAndAddModules().build();
    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private SiteCache cache;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        this.redis = mock(StringRedisTemplate.class);
        this.values = mock(ValueOperations.class);
        when(this.redis.opsForValue()).thenReturn(this.values);
        this.cache = new SiteCache(this.redis, this.json);
    }

    @Test
    void aMissBuildsTheShowcaseAndKeepsItForAboutHalfAnHour() {
        AtomicInteger builds = new AtomicInteger();

        SiteDto site = this.cache.showcase(() -> {
            builds.incrementAndGet();
            return sample();
        });

        assertThat(builds).hasValue(1);
        assertThat(site.totals().songs()).isEqualTo(38L);
        ArgumentCaptor<Duration> ttl = ArgumentCaptor.forClass(Duration.class);
        verify(this.values).set(eq(KEY), anyString(), ttl.capture());
        assertThat(ttl.getValue()).isBetween(Duration.ofMinutes(24L), Duration.ofMinutes(36L));
    }

    @Test
    void aHitIsServedWithoutTouchingTheCatalogue() throws Exception {
        when(this.values.get(KEY)).thenReturn(this.json.writeValueAsString(sample()));

        SiteDto site = this.cache.showcase(() -> {
            throw new AssertionError("a cached showcase must not be rebuilt");
        });

        assertThat(site.trending()).extracting(SiteDto.SiteItem::title).containsExactly("Hakuna Mungu Kama Wewe");
        assertThat(site.generatedAt()).isEqualTo(Instant.parse("2026-10-22T20:00:00Z"));
        verify(this.values, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void redisDownIsACacheMissNotAnError() {
        when(this.values.get(KEY)).thenThrow(new RedisConnectionFailureException("down"));
        doThrow(new RedisConnectionFailureException("down")).when(this.values).set(anyString(), anyString(), any(Duration.class));

        assertThat(this.cache.showcase(SiteCacheTest::sample).totals().churches()).isEqualTo(5L);
    }

    @Test
    void aCatalogueEventDropsTheShowcase() {
        new SiteCacheInvalidationHandler(Topics.CATALOG_MEDIA, this.cache).handle(null);

        verify(this.redis).delete(KEY);
    }

    @Test
    void invalidatingWithRedisDownIsQuiet() {
        when(this.redis.delete(KEY)).thenThrow(new RedisConnectionFailureException("down"));

        this.cache.invalidate();

        verify(this.redis).delete(KEY);
    }

    private static SiteDto sample() {
        return new SiteDto(
            new SiteDto.SiteTotals(38L, 5L, 4L, 7L, 41L, 5L, 7L),
            List.of(new SiteDto.SiteItem("3268c157-91dc-5e4f-a1ac-5ec9357c98b9", "Hakuna Mungu Kama Wewe", "COSACOW Nairobi",
                "b4f12b98-1b92-5b62-bfee-1d1827735da2", null, "https://picsum.photos/seed/ke-hakuna-mungu/400/400", MediaType.SONG, 302000)),
            List.of(),
            List.of(new SiteDto.SiteCollection("p1", "Sabbath Morning", null, null, 12)),
            List.of(),
            Instant.parse("2026-10-22T20:00:00Z")
        );
    }
}
