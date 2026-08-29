package org.adventwave.gateway;

import java.util.UUID;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

class PublicationGateTest extends IntegrationTest {
    @Autowired
    JdbcTemplate jdbc;

    private UUID churchWithLicence(String consentStatus) {
        UUID uuid = UUID.randomUUID();
        this.jdbc.update("INSERT INTO churches (id, name, consent_status) VALUES (?, ?, ?)", new Object[]{uuid, "Test Church " + uuid, consentStatus});
        return uuid;
    }

    private UUID licence(UUID churchId, String consentStatus) {
        UUID uuid = UUID.randomUUID();
        this.jdbc
            .update(
                "INSERT INTO licenses (id, church_id, consent_status, granted_at)\nVALUES (?, ?, ?, CASE WHEN ? = 'granted' THEN now() ELSE NULL END)\n",
                new Object[]{uuid, churchId, consentStatus, consentStatus}
            );
        return uuid;
    }

    private UUID artist(UUID churchId) {
        UUID uuid = UUID.randomUUID();
        this.jdbc
            .update(
                "INSERT INTO artists (id, name, slug, church_id) VALUES (?, ?, ?, ?)", new Object[]{uuid, "Test Choir " + uuid, "test-choir-" + uuid, churchId}
            );
        return uuid;
    }

    private void insertItem(UUID id, UUID artistId, UUID licenceId, String status) {
        this.jdbc
            .update(
                "INSERT INTO media_items (id, media_type, title, artist_id, duration_ms, status, license_id)\nVALUES (?, 'song', 'Test Hymn', ?, 240000, ?, ?)\n",
                new Object[]{id, artistId, status, licenceId}
            );
    }

    @Test
    @DisplayName("publishing with a granted licence is allowed")
    void grantedLicencePublishes() {
        UUID uuid = this.churchWithLicence("granted");
        UUID uuid1 = this.licence(uuid, "granted");
        UUID uuid2 = UUID.randomUUID();
        this.insertItem(uuid2, this.artist(uuid), uuid1, "published");
        Assertions.assertThat((String)this.jdbc.queryForObject("SELECT status FROM media_items WHERE id = ?", String.class, new Object[]{uuid2}))
            .isEqualTo("published");
    }

    @Test
    @DisplayName("publishing with a pending licence is refused by the database")
    void pendingLicenceIsRefused() {
        UUID uuid = this.churchWithLicence("pending");
        UUID uuid1 = this.licence(uuid, "pending");
        UUID uuid2 = this.artist(uuid);
        Assertions.assertThatThrownBy(() -> this.insertItem(UUID.randomUUID(), uuid2, uuid1, "published")).hasMessageContaining("cannot be published");
    }

    @Test
    @DisplayName("publishing with no licence at all is refused")
    void missingLicenceIsRefused() {
        UUID uuid = this.churchWithLicence("granted");
        UUID uuid1 = this.artist(uuid);
        Assertions.assertThatThrownBy(() -> this.insertItem(UUID.randomUUID(), uuid1, null, "published")).hasMessageContaining("cannot be published");
    }

    @Test
    @DisplayName("a draft needs no licence — the gate is on publication, not on existence")
    void draftsAreUnaffected() {
        UUID uuid = this.churchWithLicence("pending");
        UUID uuid1 = UUID.randomUUID();
        this.insertItem(uuid1, this.artist(uuid), null, "draft");
        Assertions.assertThat((String)this.jdbc.queryForObject("SELECT status FROM media_items WHERE id = ?", String.class, new Object[]{uuid1}))
            .isEqualTo("draft");
    }

    @Test
    @DisplayName("promoting an existing draft to published is gated too, not only inserts")
    void updateIsGated() {
        UUID uuid = this.churchWithLicence("revoked");
        UUID uuid1 = this.licence(uuid, "revoked");
        UUID uuid2 = UUID.randomUUID();
        this.insertItem(uuid2, this.artist(uuid), uuid1, "draft");
        Assertions.assertThatThrownBy(() -> this.jdbc.update("UPDATE media_items SET status = 'published' WHERE id = ?", new Object[]{uuid2}))
            .hasMessageContaining("cannot be published");
    }
}
