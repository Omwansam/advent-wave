package org.adventwave.gateway.events;

import org.adventwave.contracts.events.Topics;
import org.adventwave.events.EventEnvelope;
import org.adventwave.events.EventHandler;
import org.adventwave.gateway.assemble.SiteCache;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The public site's showcase (RFC 0008) counts what is published and names who made it, so a
 * change on any catalogue topic drops it and the next visitor rebuilds it — guardrail 2, like
 * {@link HomeCacheInvalidationHandler}. One handler per topic; idempotent by nature.
 */
public record SiteCacheInvalidationHandler(String topic, SiteCache cache) implements EventHandler {
    @Override
    public void handle(EventEnvelope envelope) {
        this.cache.invalidate();
    }

    @Configuration
    static class Registration {
        @Bean
        SiteCacheInvalidationHandler siteCacheOnMedia(SiteCache cache) {
            return new SiteCacheInvalidationHandler(Topics.CATALOG_MEDIA, cache);
        }

        @Bean
        SiteCacheInvalidationHandler siteCacheOnArtist(SiteCache cache) {
            return new SiteCacheInvalidationHandler(Topics.CATALOG_ARTIST, cache);
        }

        @Bean
        SiteCacheInvalidationHandler siteCacheOnPlaylist(SiteCache cache) {
            return new SiteCacheInvalidationHandler(Topics.CATALOG_PLAYLIST, cache);
        }
    }
}
