package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

/** One row of the conferences table (RFC 0009), for the admin portal's conference picker. */
@JsonInclude(Include.NON_NULL)
public record AdminConferenceDto(String id, String name, String shortName, String kind, String parentId) {
}
