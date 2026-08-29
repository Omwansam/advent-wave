package org.adventwave.gateway.security;

import java.util.UUID;

public record AuthenticatedUser(UUID id, String externalAuthId, String email, String displayName) {
}
