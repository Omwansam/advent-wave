package org.adventwave.contracts.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /v1/auth/password-reset/confirm} (RFC 0005): the emailed token and the new password. */
public record ListenerPasswordResetConfirm(
    @NotBlank @Size(max = 200) String token,
    @NotBlank @Size(max = 128) String newPassword
) {
}
