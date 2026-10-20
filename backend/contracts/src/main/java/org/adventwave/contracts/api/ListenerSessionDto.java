package org.adventwave.contracts.api;

/**
 * A signed-in listener (RFC 0005): from register, login, a password reset or a password change.
 * {@code token} is a bearer JWT; {@code expiresIn} is seconds.
 */
public record ListenerSessionDto(String token, String tokenType, long expiresIn, UserDto user) {
}
