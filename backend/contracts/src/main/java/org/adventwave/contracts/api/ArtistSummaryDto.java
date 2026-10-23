package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

/**
 * A profile on a card (RFC 0009): enough for a round picture, a name and "Youth choir · Nairobi
 * Central SDA". {@code churchId} and {@code churchName} are its home church's profile; absent for a
 * church itself and for an independent choir, group or singer.
 */
@JsonInclude(Include.NON_NULL)
public record ArtistSummaryDto(
    String id, String name, String cover, ArtistKind kind, Ensemble ensemble, boolean verified, String churchId, String churchName, String location
) {
}
