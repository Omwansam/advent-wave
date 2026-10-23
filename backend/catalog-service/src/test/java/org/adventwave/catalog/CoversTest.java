package org.adventwave.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.Ensemble;
import org.junit.jupiter.api.Test;

/** RFC 0009: every profile has a cover, its own or a gospel placeholder for its kind. */
class CoversTest {
    private static final String APP = "https://adventwave.example.org";

    @Test
    void aProfilesOwnCoverWins() {
        Artist a = artist(ArtistKind.CHOIR, Ensemble.MAIN);
        a.setCoverUrl("https://cdn.example.org/choir.jpg");

        assertThat(Covers.artist(a, APP)).isEqualTo("https://cdn.example.org/choir.jpg");
    }

    @Test
    void aCoverStoredAsAPathIsTheWebApps() {
        Artist a = artist(ArtistKind.CHURCH, null);
        a.setCoverUrl("/covers/church-2.jpg");

        assertThat(Covers.artist(a, APP + "/")).isEqualTo(APP + "/covers/church-2.jpg");
        assertThat(Covers.absolute("//cdn.example.org/x.jpg", APP)).isEqualTo("//cdn.example.org/x.jpg");
    }

    @Test
    void withoutOneEachKindGetsAPlaceholderFromItsOwnSet() {
        assertThat(Covers.artist(artist(ArtistKind.CHURCH, null), APP)).matches(APP + "/covers/church-[1-5]\\.jpg");
        assertThat(Covers.artist(artist(ArtistKind.CHOIR, Ensemble.MAIN), APP)).matches(APP + "/covers/choir-[1-7]\\.jpg");
        assertThat(Covers.artist(artist(ArtistKind.CHOIR, Ensemble.YOUTH), APP)).matches(APP + "/covers/youth-[1-4]\\.jpg");
        assertThat(Covers.artist(artist(ArtistKind.CHOIR, Ensemble.CHILDREN), APP)).isEqualTo(APP + "/covers/children-1.jpg");
        assertThat(Covers.artist(artist(ArtistKind.PREACHER, null), APP)).matches(APP + "/covers/preacher-[1-3]\\.jpg");
        assertThat(Covers.artist(artist(ArtistKind.MINISTRY, null), APP)).matches(APP + "/covers/ministry-[1-2]\\.jpg");
        assertThat(Covers.artist(artist(ArtistKind.SOLOIST, null), APP)).matches(APP + "/covers/group-[1-4]\\.jpg");
    }

    @Test
    void theSameProfileAlwaysGetsTheSamePlaceholder() {
        Artist a = artist(ArtistKind.CHOIR, Ensemble.WOMEN);
        String first = Covers.artist(a, APP);

        assertThat(Covers.artist(a, APP)).isEqualTo(first);
        a.setCoverUrl("  ");
        assertThat(Covers.artist(a, APP)).isEqualTo(first);
    }

    private static Artist artist(ArtistKind kind, Ensemble ensemble) {
        Artist a = new Artist();
        a.setId(UUID.randomUUID());
        a.setName("Profile " + UUID.randomUUID());
        a.setKind(kind);
        a.setEnsemble(ensemble);
        return a;
    }
}
