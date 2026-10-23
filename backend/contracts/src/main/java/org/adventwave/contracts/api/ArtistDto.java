package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

/**
 * A profile page ({@code GET /v1/artists/{id}}). Since RFC 0009 every profile has a {@code kind};
 * a church's {@code tracks} include its choirs', most popular first, and its {@code members} are
 * the choirs, groups and preachers whose home it is. {@code church} is a member's home church,
 * {@code related} its sister choirs there, or similar profiles for one without a home church.
 * {@code conference} is the profile's own, or else its home church's.
 */
@JsonInclude(Include.NON_NULL)
public record ArtistDto(
    String id,
    String name,
    String slug,
    String cover,
    boolean verified,
    List<String> songIds,
    List<TrackDto> tracks,
    ArtistKind kind,
    Ensemble ensemble,
    String bio,
    String location,
    Long followers,
    ConferenceDto conference,
    ArtistSummaryDto church,
    List<ArtistSummaryDto> members,
    List<ArtistSummaryDto> related
) {
    public ArtistDto withoutTracks() {
        return new ArtistDto(
            this.id, this.name, this.slug, this.cover, this.verified, this.songIds, null, this.kind, this.ensemble, this.bio, this.location, this.followers,
            this.conference, this.church, this.members, this.related
        );
    }
}
