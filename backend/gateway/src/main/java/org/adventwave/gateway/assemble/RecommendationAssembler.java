package org.adventwave.gateway.assemble;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.RecommendationsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.platform.library.LibraryService;
import org.adventwave.platform.library.LibrarySnapshot;
import org.adventwave.platform.library.PlaylistSummary;
import org.adventwave.platform.library.LibrarySnapshot.HistoryRow;
import org.adventwave.reco.ContentBasedRecommender;
import org.adventwave.reco.TasteProfile;
import org.springframework.stereotype.Component;

@Component
public class RecommendationAssembler {
    private static final int CATALOGUE_LIMIT = 500;
    private final CatalogService catalog;
    private final LibraryService library;
    private final PlaylistAssembler playlists;
    private final ContentBasedRecommender recommender;

    public RecommendationAssembler(CatalogService catalog, LibraryService library, PlaylistAssembler playlists, ContentBasedRecommender recommender) {
        this.catalog = catalog;
        this.library = library;
        this.playlists = playlists;
        this.recommender = recommender;
    }

    public RecommendationsDto forUser(UUID userId) {
        LibrarySnapshot librarysnapshot = this.library.snapshot(userId);
        return this.forUser(userId, librarysnapshot);
    }

    public RecommendationsDto forUser(UUID userId, LibrarySnapshot snapshot) {
        List<TrackDto> list = this.catalog.byType(MediaType.SONG, 500);
        List<PlaylistDto> list1 = Stream.<PlaylistSummary>concat(this.library.curatedPlaylists().stream(), this.library.userPlaylists(userId).stream())
            .map(this.playlists::summarise)
            .toList();
        TasteProfile tasteprofile = new TasteProfile(
            snapshot.likedSongIds().stream().map(UUID::toString).toList(),
            snapshot.recentHistory().stream().map(row -> row.mediaItemId().toString()).toList(),
            this.catalog.artistNamesById(snapshot.followedArtistIds()).values().stream().toList()
        );
        return this.recommender.recommend(tasteprofile, list, list1);
    }
}
