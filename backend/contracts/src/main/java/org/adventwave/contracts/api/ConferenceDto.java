package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

/**
 * One unit of the church's structure in Kenya (RFC 0009): the division, a union conference, or a
 * conference or field under a union. {@code kind} is {@code division | union | conference | field}.
 *
 * <p>On a profile, {@code union} names the union the conference is in. In
 * {@code GET /v1/conferences}, a union carries its {@code conferences}, and each of those how many
 * church profiles with something to hear it has.
 */
@JsonInclude(Include.NON_NULL)
public record ConferenceDto(
    String id,
    String name,
    String shortName,
    String kind,
    String headquarters,
    String website,
    ConferenceDto union,
    Integer churches,
    List<ConferenceDto> conferences
) {
}
