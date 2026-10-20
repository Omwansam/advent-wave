package org.adventwave.contracts.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /v1/auth/register} (RFC 0005). {@code name} defaults to the email's local part. */
public record ListenerRegisterRequest(
    @Email @NotBlank @Size(max = 254) String email,
    @NotBlank @Size(max = 128) String password,
    @Size(max = 80) String name
) {
}
