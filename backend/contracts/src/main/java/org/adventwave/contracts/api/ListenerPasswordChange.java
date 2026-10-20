package org.adventwave.contracts.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /v1/me/password} (RFC 0005). */
public record ListenerPasswordChange(
    @NotBlank @Size(max = 128) String currentPassword,
    @NotBlank @Size(max = 128) String newPassword
) {
}
