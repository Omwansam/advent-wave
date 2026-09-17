package org.adventwave.gateway.events;

import org.adventwave.contracts.events.Topics;
import org.adventwave.events.EventEnvelope;
import org.adventwave.events.EventHandler;
import org.adventwave.gateway.assemble.HomeSectionCache;
import org.springframework.stereotype.Component;

/**
 * Cache invalidation rides the catalogue topics (plan §1 day 4, guardrail 2): a playlist
 * changing is a {@code catalog.playlist.v1} message, and this is its consumer. The home page's
 * cached rails are dropped so the next request rebuilds them. Idempotent by nature — dropping
 * a cache twice is dropping it once.
 */
@Component
public class HomeCacheInvalidationHandler implements EventHandler {
    private final HomeSectionCache cache;

    public HomeCacheInvalidationHandler(HomeSectionCache cache) {
        this.cache = cache;
    }

    @Override
    public String topic() {
        return Topics.CATALOG_PLAYLIST;
    }

    @Override
    public void handle(EventEnvelope envelope) {
        this.cache.invalidateAll();
    }
}
