package org.adventwave.gateway.assemble;

import java.time.Instant;
import org.adventwave.catalog.CatalogService;
import org.adventwave.catalog.CatalogTotals;
import org.adventwave.contracts.api.SiteDto;
import org.adventwave.platform.library.LibraryService;
import org.springframework.stereotype.Component;

/**
 * {@code GET /v1/site} (RFC 0008): the catalogue as the public website shows it. The rails are
 * the home page's shared ones, so the site and the app agree on what is trending; the whole
 * response is then cached as one value by {@link SiteCache}.
 */
@Component
public class SiteAssembler {
    private static final int TRENDING = 8;
    private static final int SERMONS = 6;
    private static final int PLAYLISTS = 6;
    private static final long MS_PER_HOUR = 3_600_000L;
    private final CatalogService catalog;
    private final LibraryService library;
    private final HomeAssembler home;
    private final SiteCache cache;

    public SiteAssembler(CatalogService catalog, LibraryService library, HomeAssembler home, SiteCache cache) {
        this.catalog = catalog;
        this.library = library;
        this.home = home;
        this.cache = cache;
    }

    public SiteDto assemble() {
        return this.cache.showcase(this::build);
    }

    private SiteDto build() {
        CatalogTotals totals = this.catalog.publishedTotals();
        return new SiteDto(
            new SiteDto.SiteTotals(
                totals.songs(),
                totals.sermons(),
                totals.podcasts(),
                totals.durationMs() / MS_PER_HOUR,
                totals.artists(),
                totals.churches(),
                this.library.curatedPlaylists().size()
            ),
            this.home.trendingRail().stream().limit(TRENDING).map(SiteDto.SiteItem::of).toList(),
            this.home.sermonsRail().stream().limit(SERMONS).map(SiteDto.SiteItem::of).toList(),
            this.home.sabbathWorshipRail().stream().limit(PLAYLISTS).map(SiteDto.SiteCollection::of).toList(),
            this.catalog.discoverCategories(),
            Instant.now()
        );
    }
}
