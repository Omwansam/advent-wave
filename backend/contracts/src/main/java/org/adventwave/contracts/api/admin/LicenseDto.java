package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A licence — the consent record a media item must point at to be published. Mirrors the
 * licenses table. The publication gate is a database trigger; this is just how the row gets there.
 */
@JsonInclude(Include.NON_NULL)
public record LicenseDto(
    String id,
    String churchId,
    String consentStatus,
    String consentDocumentUrl,
    String territory,
    String grantedAt,
    String expiresAt,
    BigDecimal revenueSharePct,
    String createdAt
) {
    public record Request(
        @NotNull UUID churchId,
        String consentDocumentUrl,
        String territory,
        String expiresAt,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal revenueSharePct
    ) {
    }

    /** Granting sets granted_at; revoking or expiring leaves it as the historical record. */
    public record StatusRequest(@NotBlank @Pattern(regexp = "pending|granted|revoked|expired") String consentStatus) {
    }
}
