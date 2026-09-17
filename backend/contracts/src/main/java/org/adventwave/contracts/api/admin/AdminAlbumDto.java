package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@JsonInclude(Include.NON_NULL)
public record AdminAlbumDto(String id, String title, String artistId, String coverUrl, String releaseDate, String createdAt) {
    public record Request(@NotBlank String title, @NotNull UUID artistId, String coverUrl, String releaseDate) {
    }

    public record Update(String title, String coverUrl, String releaseDate) {
    }
}
