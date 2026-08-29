package org.adventwave.catalog.search;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SearchRankingTest {
    @Test
    @DisplayName("exact match scores 10000")
    void exactMatch() {
        Assertions.assertThat(SearchRanking.matchScore("It Is Well", "it is well")).isEqualTo(10000);
    }

    @Test
    @DisplayName("prefix match scores 8000 plus a short-title bonus")
    void prefixMatch() {
        Assertions.assertThat(SearchRanking.matchScore("Cornerstone", "corner")).isEqualTo(8189);
    }

    @Test
    @DisplayName("substring match scores 6000 minus the match position")
    void substringMatch() {
        Assertions.assertThat(SearchRanking.matchScore("Amazing Grace (Acoustic)", "grace")).isEqualTo(5992);
    }

    @Test
    @DisplayName("an earlier substring outranks a later one")
    void earlierMatchesRankHigher() {
        int i = SearchRanking.matchScore("Hope Channel Studio", "channel");
        int j = SearchRanking.matchScore("The Long Awaited Channel", "channel");
        Assertions.assertThat(i).isGreaterThan(j);
    }

    @Test
    @DisplayName("exact beats prefix beats substring")
    void ordering() {
        int i = SearchRanking.matchScore("Cornerstone", "cornerstone");
        int j = SearchRanking.matchScore("Cornerstone Live", "cornerstone");
        int k = SearchRanking.matchScore("The Cornerstone", "cornerstone");
        Assertions.assertThat(i).isGreaterThan(j);
        Assertions.assertThat(j).isGreaterThan(k);
    }

    @Test
    @DisplayName("no match, empty query and null text all return -1")
    void noMatch() {
        Assertions.assertThat(SearchRanking.matchScore("Blessed Assurance", "zzz")).isEqualTo(-1);
        Assertions.assertThat(SearchRanking.matchScore("Blessed Assurance", "   ")).isEqualTo(-1);
        Assertions.assertThat(SearchRanking.matchScore(null, "grace")).isEqualTo(-1);
    }

    @Test
    @DisplayName("track score takes the best of title, artist and album")
    void bestOfThreeFields() {
        int i = SearchRanking.bestTrackScore("Tumsifu Bwana", "Maxwell SDA Church Choir, Nairobi", "Swahili Praise Live", "maxwell");
        Assertions.assertThat(i).isEqualTo(SearchRanking.matchScore("Maxwell SDA Church Choir, Nairobi", "maxwell"));
    }

    @Test
    @DisplayName("a null album does not sink the score")
    void nullAlbumIsTolerated() {
        Assertions.assertThat(SearchRanking.bestTrackScore("Holy Manna", "Ukunda SDA", null, "holy")).isGreaterThan(0);
    }

    @ParameterizedTest
    @ValueSource(
        strings = {"kenya", "Nairobi", "kisumu choir", "SWAHILI worship", "cosacow", "eldoret", "nakuru", "mombasa"}
    )
    @DisplayName("Kenyan places and Swahili trigger the regional boost")
    void kenyaQueries(String query) {
        Assertions.assertThat(SearchRanking.isKenyaQuery(query)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(
        strings = {"oakwood", "hymns", "worship", ""}
    )
    @DisplayName("unrelated queries do not")
    void nonKenyaQueries(String query) {
        Assertions.assertThat(SearchRanking.isKenyaQuery(query)).isFalse();
    }

    @Test
    @DisplayName("the boost is large enough to lift a weaker string match above a stronger one")
    void boostOutweighsStringDistance() {
        int i = SearchRanking.matchScore("Maxwell SDA Church Choir, Nairobi", "nairobi") + 2500;
        int j = SearchRanking.matchScore("Nairobi Documentary Choir (US)", "nairobi");
        Assertions.assertThat(i).isGreaterThan(j);
    }
}
