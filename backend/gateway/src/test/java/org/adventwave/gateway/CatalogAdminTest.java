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

    /** Requests a transcode from the item's own master key, the only kind the service accepts. */
    private AdminMediaItemDto transcode(String mediaItemId) {
        return this.admin.requestTranscode(UUID.fromString(mediaItemId),
            new AdminMediaItemDto.TranscodeRequest("masters/" + mediaItemId + "/original.wav"));
    }

    @Test
    @DisplayName("a transcode reads only the item's own master: another item's key, or any other shape, is refused")
    void transcodeOnlyFromOwnMaster() {
        String a = this.draft().id(), b = this.draft().id();
        for (String key : new String[] {
            "masters/" + b + "/original.wav",             // another item's master
            "masters/" + a + "/../" + b + "/original.wav", // walking out of this item's folder
            "masters/" + a + "/original.exe",              // not a container the tool reads
            "derived/" + a + "/aac_320.m4a",               // a derivative, not a master
        }) {
            Assertions.assertThatThrownBy(() -> this.admin.requestTranscode(UUID.fromString(a), new AdminMediaItemDto.TranscodeRequest(key)))
                .as(key).isInstanceOf(IllegalArgumentException.class);
        }
        Assertions.assertThat(this.admin.media(UUID.fromString(a)).status()).isEqualTo("draft");
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
        AdminMediaItemDto item = this.transcode(this.draft().id());
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
        String id = this.transcode(this.draft().id()).id();
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
        String id = this.transcode(this.draft().id()).id();
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
        String id = this.transcode(this.draft().id()).id();
        this.completeTranscode(id);
        Assertions.assertThat(this.admin.withdraw(UUID.fromString(id)).status()).isEqualTo("withdrawn");
        AdminMediaItemDto back = this.admin.publish(UUID.fromString(id));
        Assertions.assertThat(back.status()).isEqualTo("published");
        Assertions.assertThat(back.assets()).hasSize(1);
    }

    @Test
    @DisplayName("a failed transcode marks the item failed, and a retry is allowed from there")
    void failedTranscodeCanBeRetried() {
        String id = this.transcode(this.draft().id()).id();
        UUID eventId = UUID.randomUUID();
        this.jdbc.update("INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload) VALUES (?, 'media_item', ?, ?, ?::jsonb)",
            eventId, id, Topics.AUDIO_TRANSCODE,
            """
            {"kind":"completed","event_id":"%s","media_item_id":"%s","status":"failed","assets":[],"flags":["lossy_master"],
             "error":{"code":"verification_failed","message":"duration mismatch","stage":"verify"},"completed_at":"2026-09-17T12:00:00Z"}
            """.formatted(eventId, id));
        this.dispatcher.dispatchPending();
        Assertions.assertThat(this.admin.media(UUID.fromString(id)).status()).isEqualTo("failed");
        Assertions.assertThat(this.transcode(id).status()).isEqualTo("processing");
    }

    // ----------------------------------------------------------------- RFC 0001

    @Test
    @DisplayName("review flags from a completed transcode are stored; a failure's reason is stored; a new request clears both")
    void reviewFlagsAndFailureReason() {
        this.admin.setLicenseStatus(UUID.fromString(this.licenseId), new LicenseDto.StatusRequest("granted"));
        String id = this.transcode(this.draft().id()).id();
        UUID eventId = UUID.randomUUID();
        this.jdbc.update("INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload) VALUES (?, 'media_item', ?, ?, ?::jsonb)",
            eventId, id, Topics.AUDIO_TRANSCODE,
            """
            {"kind":"completed","event_id":"%s","media_item_id":"%s","status":"completed","duration_ms":200400,
             "loudness_lufs":-13.9,"true_peak_dbfs":-0.7,
             "assets":[{"profile":"aac_96","codec":"aac-lc","bitrate_kbps":96,"container":"m4a","sample_rate_hz":44100,
                        "channels":2,"storage_key":"derived/%s/aac_96.m4a","byte_size":2404800,"checksum_sha256":"%s"}],
             "flags":["lossy_master","long_trailing_silence"],"error":null,"completed_at":"2026-10-08T12:00:00Z"}
            """.formatted(eventId, id, id, "a".repeat(64)));
        this.dispatcher.dispatchPending();
        AdminMediaItemDto done = this.admin.media(UUID.fromString(id));
        Assertions.assertThat(done.status()).isEqualTo("published");
        Assertions.assertThat(done.reviewFlags()).containsExactly("lossy_master", "long_trailing_silence");
        Assertions.assertThat(done.failureReason()).isNull();

        String failing = this.transcode(this.draft().id()).id();
        UUID failedEvent = UUID.randomUUID();
        this.jdbc.update("INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload) VALUES (?, 'media_item', ?, ?, ?::jsonb)",
            failedEvent, failing, Topics.AUDIO_TRANSCODE,
            """
            {"kind":"completed","event_id":"%s","media_item_id":"%s","status":"failed","assets":[],"flags":[],
             "error":{"code":"probe_failed","message":"x.wav has no audio stream","stage":"probe"},"completed_at":"2026-10-08T12:00:00Z"}
            """.formatted(failedEvent, failing));
        this.dispatcher.dispatchPending();
        AdminMediaItemDto failed = this.admin.media(UUID.fromString(failing));
        Assertions.assertThat(failed.status()).isEqualTo("failed");
        Assertions.assertThat(failed.failureReason()).isEqualTo("x.wav has no audio stream (stage probe)");

        AdminMediaItemDto retried = this.transcode(failing);
        Assertions.assertThat(retried.failureReason()).isNull();
        Assertions.assertThat(retried.reviewFlags()).isEmpty();
    }

    @Test
    @DisplayName("the media list filters by type and by a case-insensitive title substring; % and _ are literal")
    void mediaFilters() {
        String unique = "Zephaniah " + UUID.randomUUID().toString().substring(0, 8);
        this.admin.createMedia(new AdminMediaItemDto.Request(
            "sermon", unique, UUID.fromString(this.artistId), null, 1000, null, null, null, null, null, null));
        Assertions.assertThat(this.admin.listMedia(null, "sermon", unique.toUpperCase(), 100))
            .extracting(AdminMediaItemDto::title).containsExactly(unique);
        Assertions.assertThat(this.admin.listMedia(null, "song", unique, 100)).isEmpty();
        Assertions.assertThat(this.admin.listMedia("draft", null, unique, 100)).hasSize(1);
        Assertions.assertThat(this.admin.listMedia(null, null, "%", 500)).isEmpty();
        Assertions.assertThat(this.admin.listMedia("no-such-status", null, null, 10)).isEmpty();
    }

    @Test
    @DisplayName("albums list by artist; licences list across churches and by status")
    void lists() {
        this.admin.createAlbum(new org.adventwave.contracts.api.admin.AdminAlbumDto.Request("Album Two", UUID.fromString(this.artistId), null, "2024-01-01"));
        this.admin.createAlbum(new org.adventwave.contracts.api.admin.AdminAlbumDto.Request("Album One", UUID.fromString(this.artistId), null, "2020-01-01"));
        Assertions.assertThat(this.admin.listAlbums(UUID.fromString(this.artistId)))
            .extracting(org.adventwave.contracts.api.admin.AdminAlbumDto::title).containsExactly("Album Two", "Album One");
        Assertions.assertThat(this.admin.listLicenses("pending")).extracting(LicenseDto::id).contains(this.licenseId);
        Assertions.assertThat(this.admin.listLicenses("granted")).extracting(LicenseDto::id).doesNotContain(this.licenseId);
        Assertions.assertThatThrownBy(() -> this.admin.listLicenses("maybe")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("without a local media origin, preview refuses rather than hand out unsigned CDN URLs")
    void previewNeedsSignedUrls() {
        String id = this.draft().id();
        Assertions.assertThatThrownBy(() -> this.admin.preview(UUID.fromString(id)))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
            .hasMessageContaining("signed media URLs");
    }
}
