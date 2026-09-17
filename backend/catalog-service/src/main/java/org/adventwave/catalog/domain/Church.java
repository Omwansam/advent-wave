package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A contributing church — the party whose consent a licence records (plan §3, workstream H). */
@Entity
@Table(name = "churches")
@Getter
@Setter
@NoArgsConstructor
public class Church {
    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    @Column
    private String country;

    @Column
    private String region;

    @Column(name = "contact_email")
    private String contactEmail;

    /** none | pending | granted | revoked — the church-level relationship, not a licence. */
    @Column(name = "consent_status", nullable = false)
    private String consentStatus = "none";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Church(String name, String country, String region, String contactEmail) {
        this.name = name;
        this.country = country;
        this.region = region;
        this.contactEmail = contactEmail;
    }
}
