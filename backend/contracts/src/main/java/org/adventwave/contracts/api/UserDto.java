package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

@JsonInclude(Include.NON_NULL)
public record UserDto(String id, String email, String name, String region, String createdAt) {
}
