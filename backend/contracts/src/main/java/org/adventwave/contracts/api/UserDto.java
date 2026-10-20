package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

@JsonInclude(Include.NON_NULL)
public record UserDto(
    String id,
    String email,
    String name,
    String region,
    String createdAt,
    // RFC 0005. Present only for an account with an AdventWave password: whether its owner has
    // followed the verification link. Absent for accounts from the dev issuer or an external IdP.
    Boolean emailVerified
) {
}
