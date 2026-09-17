package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

/** Every artists column, unlike the listener-facing ArtistDto which omits bio and church. */
@JsonInclude(Include.NON_NULL)
public record AdminArtistDto(
    String id, String name, String slug, String coverUrl, String bio, String churchId, boolean verified, String createdAt
) {
    public record Request(@NotBlank String name, String slug, String coverUrl, String bio, UUID churchId, Boolean verified) {
    }
}
