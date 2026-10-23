package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.Ensemble;

/**
 * Every artists column, unlike the listener-facing ArtistDto which omits church. {@code churchId}
 * is the contributor that holds the rights; {@code homeChurchId} the church profile a choir or
 * preacher belongs to (RFC 0009).
 */
@JsonInclude(Include.NON_NULL)
public record AdminArtistDto(
    String id,
    String name,
    String slug,
    String coverUrl,
    String bio,
    String churchId,
    boolean verified,
    String createdAt,
    ArtistKind kind,
    Ensemble ensemble,
    String homeChurchId,
    String conferenceId,
    String location
) {
    /**
     * {@code kind} absent keeps the current one (a new profile is a choir); {@code ensemble} applies
     * to a choir only and defaults to main; {@code homeChurchId} must be a church profile.
     */
    public record Request(
        @NotBlank String name,
        String slug,
        String coverUrl,
        String bio,
        UUID churchId,
        Boolean verified,
        ArtistKind kind,
        Ensemble ensemble,
        UUID homeChurchId,
        String conferenceId,
        String location
    ) {
    }
}
