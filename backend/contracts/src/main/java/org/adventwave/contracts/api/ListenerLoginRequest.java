package org.adventwave.contracts.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /v1/auth/login} (RFC 0005). */
public record ListenerLoginRequest(
    @NotBlank @Size(max = 254) String email,
    @NotBlank @Size(max = 128) String password
) {
}
