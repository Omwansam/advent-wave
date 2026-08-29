package org.adventwave.reco;

import java.util.ArrayList;
import java.util.List;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.RecommendationsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.contracts.api.RecommendationsDto.BecauseYouListened;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ContentBasedRecommenderTest {
    private final ContentBasedRecommender recommender = new ContentBasedRecommender();
    private final List<TrackDto> catalogue = List.of(
        track("s13", "Tumsifu Bwana", "Maxwell SDA", "gospel_swahili", "sw", "kenya", 90),
        track("s14", "Jina Lake Yesu", "Kisumu Central", "gospel_swahili", "sw", "kenya", 89),
        track("s15", "Hakuna Mungu", "COSACOW Nairobi", "choir", "mixed", "kenya", 94),
        track("s28", "Taifa Lako", "UoN Adventist", "youth", "sw", "kenya", 88),
        track("s1", "Come Thou Fount", "Heritage Singers", "worship", "en", "global", 86),
        track("s5", "How Great Thou Art", "Oakwood Aeolians", "choir", "en", "global", 92),
        track("s9", "The Lord Is My Shepherd", "Instrumental Faith", "instrumental", "en", "global", 76)
    );

    private static TrackDto track(String id, String title, String artist, String genre, String language, String region, int popularity) {
        return new TrackDto(
            id,
            title,
            artist,
            "Album " + id,
            240,
            null,
            null,
            MediaType.SONG,
            "artist-" + artist,
            "album-" + id,
            240000,
            genre,
            language,
            region,
            popularity,
            null
        );
    }

    @Test
    @DisplayName("a cold-start listener still gets a full shelf, ordered by popularity")
    void coldStart() {
        RecommendationsDto recommendationsdto = this.recommender.recommend(TasteProfile.empty(), this.catalogue, List.of());
        Assertions.assertThat(recommendationsdto.recommendedSongs()).isNotEmpty();
        Assertions.assertThat(((TrackDto)recommendationsdto.recommendedSongs().get(0)).popularity())
            .isGreaterThanOrEqualTo(((TrackDto)recommendationsdto.recommendedSongs().get(1)).popularity());
        Assertions.assertThat(recommendationsdto.trendingInRegion().region()).isEqualTo("kenya");
        Assertions.assertThat(recommendationsdto.trendingInRegion().label()).isEqualTo("Kenya & East Africa");
    }

    @Test
    @DisplayName("liked tracks are never recommended back to the listener")
    void likedTracksAreExcluded() {
        TasteProfile tasteprofile = new TasteProfile(List.of("s13", "s14"), List.of(), List.of());
        RecommendationsDto recommendationsdto = this.recommender.recommend(tasteprofile, this.catalogue, List.of());
        Assertions.assertThat(recommendationsdto.recommendedSongs()).extracting(TrackDto::id).doesNotContain(new String[]{"s13", "s14"});
    }

    @Test
    @DisplayName("Swahili listening surfaces Swahili and Kenyan material first")
    void tasteDrivesOrdering() {
        TasteProfile tasteprofile = new TasteProfile(List.of(), List.of("s13"), List.of());
        RecommendationsDto recommendationsdto = this.recommender.recommend(tasteprofile, this.catalogue, List.of());
        Assertions.assertThat(((TrackDto)recommendationsdto.recommendedSongs().get(0)).region()).isEqualTo("kenya");
        Assertions.assertThat(recommendationsdto.trendingInRegion().region()).isEqualTo("kenya");
    }

    @Test
    @DisplayName("following an artist counts even with no plays behind it")
    void followsAreASignalOnTheirOwn() {
        TasteProfile tasteprofile = new TasteProfile(List.of(), List.of(), List.of("Instrumental Faith"));
        RecommendationsDto recommendationsdto = this.recommender.recommend(tasteprofile, this.catalogue, List.of());
        Assertions.assertThat(((TrackDto)recommendationsdto.recommendedSongs().get(0)).artist()).isEqualTo("Instrumental Faith");
    }

    @Test
    @DisplayName("because-you-listened anchors on the most recent play and excludes it")
    void becauseYouListened() {
        TasteProfile tasteprofile = new TasteProfile(List.of(), List.of("s13"), List.of());
        BecauseYouListened becauseyoulistened = this.recommender.recommend(tasteprofile, this.catalogue, List.of()).becauseYouListened();
        Assertions.assertThat(becauseyoulistened).isNotNull();
        Assertions.assertThat(becauseyoulistened.artistName()).isEqualTo("Maxwell SDA");
        Assertions.assertThat(becauseyoulistened.songs()).extracting(TrackDto::id).doesNotContain(new String[]{"s13"});
        Assertions.assertThat(becauseyoulistened.songs()).extracting(TrackDto::genre).containsOnly(new String[]{"gospel_swahili"});
    }

    @Test
    @DisplayName("no history means no because-you-listened shelf, not an empty one")
    void becauseYouListenedIsNullWithoutHistory() {
        Assertions.assertThat(this.recommender.recommend(TasteProfile.empty(), this.catalogue, List.of()).becauseYouListened()).isNull();
    }

    @Test
    @DisplayName("playlists containing liked and on-taste tracks rank above generic ones")
    void playlistRanking() {
        PlaylistDto playlistdto = new PlaylistDto("p6", "Swahili worship picks", "Injili na tenzi", null, List.of("s13", "s14", "s28"), null, true, null, "p6");
        PlaylistDto playlistdto1 = new PlaylistDto("p3", "Study & Focus", "Instrumental", null, List.of("s9"), null, true, null, "p3");
        TasteProfile tasteprofile = new TasteProfile(List.of("s13"), List.of("s14"), List.of());
        RecommendationsDto recommendationsdto = this.recommender.recommend(tasteprofile, this.catalogue, List.of(playlistdto1, playlistdto));
        Assertions.assertThat(((PlaylistDto)recommendationsdto.recommendedPlaylists().get(0)).id()).isEqualTo("p6");
    }

    @Test
    @DisplayName("an empty catalogue produces an empty response rather than an exception")
    void emptyCatalogue() {
        RecommendationsDto recommendationsdto = this.recommender.recommend(TasteProfile.empty(), List.of(), List.of());
        Assertions.assertThat(recommendationsdto.recommendedSongs()).isEmpty();
        Assertions.assertThat(recommendationsdto.trendingInRegion().songs()).isEmpty();
    }

    @Test
    @DisplayName("the shelf is capped at 18 songs")
    void songCap() {
        List<TrackDto> list = new ArrayList<>();

        for (int i = 0; i < 40; i++) {
            list.add(track("x" + i, "Title " + i, "Artist " + i, "worship", "en", "global", 50 + i % 40));
        }

        Assertions.assertThat(this.recommender.recommend(TasteProfile.empty(), list, List.of()).recommendedSongs()).hasSize(18);
    }
}
