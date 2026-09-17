package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The consent that gates publication. media_items.license_id points here, and the database
 * trigger media_items_publication_gate refuses status = 'published' unless this row is
 * 'granted' and unexpired. That check is not in this class or anywhere else in Java.
 */
@Entity
@Table(name = "licenses")
@Getter
@Setter
@NoArgsConstructor
public class License {
    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "church_id", nullable = false)
    private UUID churchId;

    /** pending | granted | revoked | expired */
    @Column(name = "consent_status", nullable = false)
    private String consentStatus = "pending";

    @Column(name = "consent_document_url")
    private String consentDocumentUrl;

    @Column(nullable = false)
    private String territory = "worldwide";

    @Column(name = "granted_at")
    private Instant grantedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revenue_share_pct")
    private BigDecimal revenueSharePct;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public License(UUID churchId, String consentDocumentUrl, String territory, Instant expiresAt, BigDecimal revenueSharePct) {
        this.churchId = churchId;
        this.consentDocumentUrl = consentDocumentUrl;
        if (territory != null && !territory.isBlank()) this.territory = territory;
        this.expiresAt = expiresAt;
        this.revenueSharePct = revenueSharePct;
    }
}
