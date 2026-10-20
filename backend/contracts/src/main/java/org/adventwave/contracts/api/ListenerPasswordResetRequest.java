package org.adventwave.contracts.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /v1/auth/password-reset} (RFC 0005). Always answered 202, account or not,
 * so the endpoint cannot be used to learn who has an account.
 */
public record ListenerPasswordResetRequest(@NotBlank @Size(max = 254) String email) {
}
