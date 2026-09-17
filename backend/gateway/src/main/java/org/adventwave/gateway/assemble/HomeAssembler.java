package org.adventwave.gateway.assemble;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.Map.Entry;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.regex.Pattern;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.HomeDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.RecommendationsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.events.counts.TrendingService;
import org.adventwave.platform.library.LibraryService;
import org.adventwave.platform.library.LibrarySnapshot;
import org.adventwave.platform.library.PlaylistSummary;
import org.adventwave.platform.library.LibrarySnapshot.HistoryRow;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class HomeAssembler {
    private static final int RECENTLY_PLAYED = 8;
    private static final int TRENDING = 18;
    private static final int SERMONS = 12;
    private static final int SABBATH_PLAYLISTS = 8;
    /** "Trending now" looks back this many days of play counts. */
    private static final int TRENDING_WINDOW_DAYS = 7;
    private static final Pattern SABBATH = Pattern.compile("\\bsabbath\\b");
    private static final Pattern WORSHIP = Pattern.compile("\\bworship\\b|\\bhymn\\b|\\bpraise\\b|\\bquiet\\b|\\brest\\b");
    private static final String FALLBACK_PLAYLIST = "home-recently-played-fallback";
    private final CatalogService catalog;
    private final LibraryService library;
    private final PlaylistAssembler playlists;
    private final RecommendationAssembler recommendations;
    private final HomeSectionCache cache;
    private final TrendingService trending;
    private final ExecutorService fanOut;

    public HomeAssembler(
        CatalogService catalog,
        LibraryService library,
        PlaylistAssembler playlists,
        RecommendationAssembler recommendations,
        HomeSectionCache cache,
        TrendingService trending,
        @Qualifier("fanOutExecutor") ExecutorService fanOut
    ) {
        this.catalog = catalog;
        this.library = library;
        this.playlists = playlists;
        this.recommendations = recommendations;
        this.cache = cache;
        this.trending = trending;
        this.fanOut = fanOut;
    }

    public HomeDto assemble(UUID userId, ZoneId zone) {
        LibrarySnapshot librarysnapshot = this.library.snapshot(userId);
        Future<List<TrackDto>> future = this.fanOut.submit(() -> this.recentlyPlayed(librarysnapshot));
        Future<List<TrackDto>> future1 = this.fanOut.submit(() -> this.cache.trending(this::trendingNow));
        Future<List<PlaylistDto>> future2 = this.fanOut.submit(() -> this.cache.sabbathWorship(this::sabbathWorship));
        Future<List<TrackDto>> future3 = this.fanOut.submit(() -> this.cache.sermons(() -> this.catalog.byType(MediaType.SERMON, 12)));
        Future<RecommendationsDto> future4 = this.fanOut.submit(() -> this.recommendations.forUser(userId, librarysnapshot));
        return new HomeDto(this.greetingPeriod(zone), this.await(future), this.await(future1), this.await(future2), this.await(future3), this.await(future4));
    }

    private List<TrackDto> recentlyPlayed(LibrarySnapshot snapshot) {
        List<UUID> list = snapshot.recentHistory().stream().<UUID>map(HistoryRow::mediaItemId).limit(8L).toList();
        return !list.isEmpty()
            ? this.catalog.tracks(list)
            : this.library.playlistByLegacyId("home-recently-played-fallback").map(playlist -> this.catalog.tracks(playlist.songIds())).orElseGet(List::of);
    }

    /**
     * What listeners actually played over the last week, from the play counts workstream C
     * maintains from playback.events.v1 — filled up with the catalogue's static popularity
     * when there are not enough counted plays yet. On a fresh database that is all of it,
     * which is the cold start the plan expects; after the first counted play it is not.
     */
    private List<TrackDto> trendingNow() {
        List<UUID> played = this.trending.topItemIds(TRENDING_WINDOW_DAYS, TRENDING);
        List<TrackDto> list = new java.util.ArrayList<>(this.catalog.tracks(played));
        if (list.size() < TRENDING) {
            java.util.Set<String> seen = list.stream().map(TrackDto::id).collect(java.util.stream.Collectors.toSet());
            this.catalog.trending(TRENDING).stream()
                .filter(t -> seen.add(t.id()))
                .limit(TRENDING - list.size())
                .forEach(list::add);
        }
        return list;
    }

    private List<PlaylistDto> sabbathWorship() {
        List<PlaylistSummary> list = this.library.curatedPlaylists();
        List<PlaylistSummary> list1 = list.stream().map(playlist -> {
            String s = (playlist.title() + " " + (playlist.description() == null ? "" : playlist.description())).toLowerCase(Locale.ROOT);
            int i = 0;
            if (SABBATH.matcher(s).find()) {
                i += 4;
            }

            if (WORSHIP.matcher(s).find()) {
                i += 2;
            }

            return Map.entry(playlist, i);
        }).filter(entry -> entry.getValue() > 0).sorted(Entry.<PlaylistSummary, Integer>comparingByValue().reversed()).map(Entry::getKey).limit(8L).toList();
        return this.playlists.resolveAll(list1.isEmpty() ? list.stream().limit(3L).toList() : list1);
    }

    private String greetingPeriod(ZoneId zone) {
        int i = LocalTime.now(zone).getHour();
        if (i >= 5 && i < 12) {
            return "morning";
        } else {
            return i < 17 ? "afternoon" : "evening";
        }
    }

    private <T> T await(Future<T> future) {
        try {
            return future.get();
        } catch (InterruptedException interruptedexception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("home assembly interrupted", interruptedexception);
        } catch (ExecutionException executionexception) {
            Throwable throwable = executionexception.getCause();
            if (throwable instanceof RuntimeException runtimeexception) {
                throw runtimeexception;
            } else {
                throw new IllegalStateException("home assembly failed", throwable);
            }
        }
    }
}
