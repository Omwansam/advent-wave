package org.adventwave.contracts.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /v1/auth/verify-email} (RFC 0005): the token from the verification email. */
public record ListenerEmailVerification(@NotBlank @Size(max = 200) String token) {
}
