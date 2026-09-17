package org.adventwave.gateway;

import java.util.List;
import java.util.UUID;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.contracts.api.admin.ChurchDto;
import org.adventwave.contracts.api.admin.LicenseDto;
import org.adventwave.contracts.events.Topics;
import org.adventwave.events.outbox.OutboxDispatcher;
import org.adventwave.gateway.admin.AdminConflictException;
import org.adventwave.gateway.admin.CatalogAdminService;
import org.adventwave.platform.domain.OutboxEvent;
import org.adventwave.platform.repo.PlatformRepositories.OutboxRepository;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The ingest path's contract terms: every write emits its event, nothing is visible before
 * publication, and publication is the database's decision. The transcode consumer is driven
 * by inserting the {@code completed} message the worker will produce (contracts/kafka/
 * audio.transcode.v1) straight into the outbox, since no worker exists yet.
 */
class CatalogAdminTest extends IntegrationTest {
    @Autowired
    CatalogAdminService admin;
    @Autowired
    OutboxDispatcher dispatcher;
    @Autowired
    OutboxRepository outbox;
    @Autowired
    JdbcTemplate jdbc;

    private String churchId;
    private String licenseId;
    private String artistId;

    @BeforeEach
    void setUp() {
        this.dispatcher.dispatchPending();
        ChurchDto church = this.admin.createChurch(new ChurchDto.Request("Test Church " + UUID.randomUUID(), "KE", "kenya", null));
        this.churchId = church.id();
        this.licenseId = this.admin.createLicense(new LicenseDto.Request(UUID.fromString(this.churchId), null, null, null, null)).id();
        this.artistId = this.admin.createArtist(new AdminArtistDto.Request("Test Choir " + UUID.randomUUID(), null, null, null, UUID.fromString(this.churchId), null)).id();
    }

    private AdminMediaItemDto draft() {
        return this.admin.createMedia(new AdminMediaItemDto.Request(
            "song", "Test Song", UUID.fromString(this.artistId), null, 200000, null, "choir", "sw", "kenya", 50, UUID.fromString(this.licenseId)));
    }

    private void completeTranscode(String mediaItemId) {
        UUID eventId = UUID.randomUUID();
        String payload = """
            {"kind":"completed","event_id":"%s","media_item_id":"%s","status":"completed",
             "duration_ms":200400,"loudness_lufs":-13.9,"true_peak_dbfs":-0.7,
             "assets":[{"profile":"aac_96","codec":"aac-lc","bitrate_kbps":96,"container":"m4a","sample_rate_hz":44100,
                        "channels":2,"storage_key":"derived/%s/aac_96.m4a","byte_size":2404800,"checksum_sha256":"%s"}],
             "flags":[],"error":null,"completed_at":"2026-09-17T12:00:00Z"}
            """.formatted(eventId, mediaItemId, mediaItemId, "a".repeat(64));
        this.jdbc.update("INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload) VALUES (?, 'media_item', ?, ?, ?::jsonb)",
            eventId, mediaItemId, Topics.AUDIO_TRANSCODE, payload);
        this.dispatcher.dispatchPending();
    }

    private List<OutboxEvent> eventsFor(String aggregateId, String topic) {
        return this.outbox.findAll().stream()
            .filter(e -> e.getAggregateId().equals(aggregateId) && e.getEventType().equals(topic))
            .toList();
    }

    @Test
    @DisplayName("creating an artist emits catalog.artist.v1 with the row's fields")
    void artistEmitsEvent() {
        List<OutboxEvent> events = this.eventsFor(this.artistId, Topics.CATALOG_ARTIST);
        Assertions.assertThat(events).hasSize(1);
        Assertions.assertThat(events.get(0).getPayload()).contains("\"artist_id\":\"" + this.artistId + "\"").contains("\"verified\":false");
    }

    @Test
    @DisplayName("a draft is not visible to listeners and emits catalog.media.v1 with status draft")
    void draftIsInvisible() {
        AdminMediaItemDto item = this.draft();
        Assertions.assertThat(item.status()).isEqualTo("draft");
        Integer visible = this.jdbc.queryForObject("SELECT COUNT(*) FROM media_items WHERE id = ? AND status = 'published'", Integer.class, UUID.fromString(item.id()));
        Assertions.assertThat(visible).isZero();
        Assertions.assertThat(this.eventsFor(item.id(), Topics.CATALOG_MEDIA).get(0).getPayload()).contains("\"status\":\"draft\"");
    }

    @Test
    @DisplayName("requesting a transcode moves to processing and emits audio.transcode.v1 requested on the right ladder")
    void transcodeRequested() {
        AdminMediaItemDto item = this.admin.requestTranscode(UUID.fromString(this.draft().id()), new AdminMediaItemDto.TranscodeRequest("masters/x/original.wav"));
        Assertions.assertThat(item.status()).isEqualTo("processing");
        List<OutboxEvent> events = this.eventsFor(item.id(), Topics.AUDIO_TRANSCODE);
        Assertions.assertThat(events).hasSize(1);
        Assertions.assertThat(events.get(0).getPayload()).contains("\"kind\":\"requested\"").contains("\"ladder\":\"music_v1\"");
        // K1: the payload's event_id is the row's event_id
        Assertions.assertThat(events.get(0).getPayload()).contains("\"event_id\":\"" + events.get(0).getEventId() + "\"");
    }

    @Test
    @DisplayName("publishing with nothing to play is refused")
    void publishWithoutOutputsIsRefused() {
        String id = this.draft().id();
        Assertions.assertThatThrownBy(() -> this.admin.publish(UUID.fromString(id)))
            .isInstanceOf(AdminConflictException.class)
            .hasMessageContaining("nothing to play");
    }

    @Test
    @DisplayName("a completed transcode under a pending licence stores its outputs but stays processing — the trigger's decision")
    void completedUnderPendingLicenceWaits() {
        String id = this.admin.requestTranscode(UUID.fromString(this.draft().id()), new AdminMediaItemDto.TranscodeRequest("masters/x/original.wav")).id();
        this.completeTranscode(id);
        AdminMediaItemDto item = this.admin.media(UUID.fromString(id));
        Assertions.assertThat(item.status()).isEqualTo("processing");
        Assertions.assertThat(item.assets()).hasSize(1);
        Assertions.assertThat(item.loudnessLufs()).isEqualTo(-13.9);
        Assertions.assertThat(item.durationMs()).isEqualTo(200400);
        Assertions.assertThatThrownBy(() -> this.admin.publish(UUID.fromString(id)))
            .isInstanceOf(AdminConflictException.class)
            .hasMessageContaining("pending");
    }

    @Test
    @DisplayName("a completed transcode under a granted licence publishes without an operator")
    void completedUnderGrantedLicencePublishes() {
        this.admin.setLicenseStatus(UUID.fromString(this.licenseId), new LicenseDto.StatusRequest("granted"));
        String id = this.admin.requestTranscode(UUID.fromString(this.draft().id()), new AdminMediaItemDto.TranscodeRequest("masters/x/original.wav")).id();
        this.completeTranscode(id);
        AdminMediaItemDto item = this.admin.media(UUID.fromString(id));
        Assertions.assertThat(item.status()).isEqualTo("published");
        Assertions.assertThat(item.publishedAt()).isNotNull();
        Assertions.assertThat(this.eventsFor(id, Topics.CATALOG_MEDIA))
            .anyMatch(e -> e.getPayload().contains("\"status\":\"published\""));
    }

    @Test
    @DisplayName("grant, publish, withdraw, re-publish: assets survive and visibility follows status")
    void withdrawAndRepublish() {
        this.admin.setLicenseStatus(UUID.fromString(this.licenseId), new LicenseDto.StatusRequest("granted"));
        String id = this.admin.requestTranscode(UUID.fromString(this.draft().id()), new AdminMediaItemDto.TranscodeRequest("masters/x/original.wav")).id();
        this.completeTranscode(id);
        Assertions.assertThat(this.admin.withdraw(UUID.fromString(id)).status()).isEqualTo("withdrawn");
        AdminMediaItemDto back = this.admin.publish(UUID.fromString(id));
        Assertions.assertThat(back.status()).isEqualTo("published");
        Assertions.assertThat(back.assets()).hasSize(1);
    }

    @Test
    @DisplayName("a failed transcode marks the item failed, and a retry is allowed from there")
    void failedTranscodeCanBeRetried() {
        String id = this.admin.requestTranscode(UUID.fromString(this.draft().id()), new AdminMediaItemDto.TranscodeRequest("masters/x/original.wav")).id();
        UUID eventId = UUID.randomUUID();
        this.jdbc.update("INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload) VALUES (?, 'media_item', ?, ?, ?::jsonb)",
            eventId, id, Topics.AUDIO_TRANSCODE,
            """
            {"kind":"completed","event_id":"%s","media_item_id":"%s","status":"failed","assets":[],"flags":["lossy_master"],
             "error":{"code":"verification_failed","message":"duration mismatch","stage":"verify"},"completed_at":"2026-09-17T12:00:00Z"}
            """.formatted(eventId, id));
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.admin.media(UUID.fromString(id)).status()).isEqualTo("failed");
        Assertions.assertThat(this.admin.requestTranscode(UUID.fromString(id), new AdminMediaItemDto.TranscodeRequest("masters/x/original.wav")).status()).isEqualTo("processing");
    }
}
