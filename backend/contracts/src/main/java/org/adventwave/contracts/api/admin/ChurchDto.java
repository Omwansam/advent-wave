package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** A contributing church, as the admin surface sees it. Mirrors the churches table. */
@JsonInclude(Include.NON_NULL)
public record ChurchDto(
    String id, String name, String country, String region, String contactEmail, String consentStatus, String createdAt
) {
    public record Request(@NotBlank String name, String country, String region, @Email String contactEmail) {
    }

    /** The church-level relationship; a licence's status is separate and is what gates publication. */
    public record ConsentRequest(@NotBlank @Pattern(regexp = "none|pending|granted|revoked") String consentStatus) {
    }
}
