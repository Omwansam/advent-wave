package org.adventwave.gateway;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.contracts.api.admin.ChurchDto;
import org.adventwave.contracts.api.admin.LicenseDto;
import org.adventwave.contracts.events.Topics;
import org.adventwave.events.outbox.OutboxDispatcher;
import org.adventwave.gateway.admin.CatalogAdminService;
import org.adventwave.gateway.audio.LocalTranscodeWorker;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * The local worker (RFC 0001) end to end through the outbox: {@code requested} → the worker →
 * {@code completed} → TranscodeCompletedHandler. A stand-in script replaces tools/transcode.py
 * so each outcome can be forced; it prints what the real tool prints. Needs python3, ffmpeg and
 * ffprobe on PATH, like the worker itself.
 */
class TranscodeWorkerTest extends IntegrationTest {
    static final Path ROOT;
    static final Path SCRIPT;

    /** Behaviour per item from {root}/mode/{id}: complete (default), fail, crash or hang. Counts runs in {root}/attempts/{id}. */
    private static final String FAKE_TOOL = """
        import json, sys, time, uuid, pathlib
        args = sys.argv[1:]
        arg = lambda k: args[args.index(k) + 1]
        mid, root = arg("--media-item-id"), pathlib.Path(arg("--media-root"))
        mode_file = root / "mode" / mid
        mode = mode_file.read_text().strip() if mode_file.exists() else "complete"
        (root / "attempts").mkdir(exist_ok=True)
        with open(root / "attempts" / mid, "a") as f:
            f.write("x")
        print(f"fake transcode: {mode}", file=sys.stderr)
        base = {"kind": "completed", "event_id": str(uuid.uuid4()), "media_item_id": mid, "completed_at": "2026-10-08T00:00:00Z"}
        if mode == "crash":
            print("Traceback: something broke", file=sys.stderr)
            sys.exit(3)
        if mode == "hang":
            time.sleep(120)
        if mode == "fail":
            print(json.dumps({**base, "status": "failed", "assets": [], "flags": [],
                              "error": {"code": "probe_failed", "message": "x.wav has no audio stream", "stage": "probe"}}))
            sys.exit(1)
        print(json.dumps({**base, "status": "completed", "duration_ms": 61000, "loudness_lufs": -16.2, "true_peak_dbfs": -1.1,
                          "assets": [{"profile": "aac_64", "codec": "aac-lc", "bitrate_kbps": 64, "container": "m4a",
                                      "sample_rate_hz": 44100, "channels": 2, "storage_key": f"derived/{mid}/aac_64.m4a",
                                      "byte_size": 488000, "checksum_sha256": "b" * 64}],
                          "flags": ["long_leading_silence"], "error": None}, indent=2))
        """;

    static {
        try {
            ROOT = Files.createTempDirectory("worker-root");
            SCRIPT = ROOT.resolve("fake_transcode.py");
            Files.writeString(SCRIPT, FAKE_TOOL);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void worker(DynamicPropertyRegistry registry) {
        registry.add("adventwave.catalog.local-media-root", ROOT::toString);
        registry.add("adventwave.audio.local-worker-enabled", () -> "true");
        registry.add("adventwave.audio.transcode-script", SCRIPT::toString);
        registry.add("adventwave.audio.transcode-timeout", () -> "3s");
        registry.add("adventwave.audio.retry-backoff", () -> "200ms,200ms");
    }

    @Autowired
    CatalogAdminService admin;
    @Autowired
    OutboxDispatcher dispatcher;
    @Autowired
    LocalTranscodeWorker worker;
    @Autowired
    JdbcTemplate jdbc;

    private String artistId;
    private String licenseId;

    @BeforeEach
    void setUp() {
        ChurchDto church = this.admin.createChurch(new ChurchDto.Request("Worker Church " + UUID.randomUUID(), "KE", "kenya", null));
        this.licenseId = this.admin.createLicense(new LicenseDto.Request(UUID.fromString(church.id()), null, null, null, null)).id();
        this.admin.setLicenseStatus(UUID.fromString(this.licenseId), new LicenseDto.StatusRequest("granted"));
        this.artistId = this.admin.createArtist(new AdminArtistDto.Request("Worker Choir " + UUID.randomUUID(), null, null, null, UUID.fromString(church.id()), null, null, null, null, null, null)).id();
    }

    private String requested(String mode) throws IOException {
        String id = this.admin.createMedia(new AdminMediaItemDto.Request(
            "sermon", "Worker Item", UUID.fromString(this.artistId), null, 60000, null, null, null, null, null, UUID.fromString(this.licenseId))).id();
        Files.createDirectories(ROOT.resolve("mode"));
        Files.writeString(ROOT.resolve("mode").resolve(id), mode);
        this.admin.requestTranscode(UUID.fromString(id), new AdminMediaItemDto.TranscodeRequest("masters/" + id + "/original.wav"));
        return id;
    }

    private AdminMediaItemDto await(String id, Set<String> terminal, Duration timeout) throws InterruptedException {
        Instant deadline = Instant.now().plus(timeout);
        while (Instant.now().isBefore(deadline)) {
            this.dispatcher.dispatchPending();
            AdminMediaItemDto item = this.admin.media(UUID.fromString(id));
            if (terminal.contains(item.status())) return item;
            Thread.sleep(150);
        }
        throw new AssertionError("media item " + id + " did not reach " + terminal + " within " + timeout);
    }

    private int attempts(String id) throws IOException {
        Path f = ROOT.resolve("attempts").resolve(id);
        return Files.exists(f) ? Files.readString(f).length() : 0;
    }

    @Test
    @DisplayName("requested → the tool's completed message → outputs, loudness and review flags stored, published under a granted licence")
    void completes() throws Exception {
        String id = this.requested("complete");
        AdminMediaItemDto item = this.await(id, Set.of("published", "failed"), Duration.ofSeconds(30));
        Assertions.assertThat(item.status()).isEqualTo("published");
        Assertions.assertThat(item.assets()).extracting(AdminMediaItemDto.Asset::profile).containsExactly("aac_64");
        Assertions.assertThat(item.durationMs()).isEqualTo(61000);
        Assertions.assertThat(item.reviewFlags()).containsExactly("long_leading_silence");
        Assertions.assertThat(item.failureReason()).isNull();
        Assertions.assertThat(this.attempts(id)).isEqualTo(1);
    }

    @Test
    @DisplayName("a failure the tool reports is final: delivered as is, no retry, its reason kept")
    void toolFailureIsFinal() throws Exception {
        String id = this.requested("fail");
        AdminMediaItemDto item = this.await(id, Set.of("failed", "published"), Duration.ofSeconds(30));
        Assertions.assertThat(item.status()).isEqualTo("failed");
        Assertions.assertThat(item.failureReason()).isEqualTo("x.wav has no audio stream (stage probe)");
        Thread.sleep(1000);
        Assertions.assertThat(this.attempts(id)).isEqualTo(1);
    }

    @Test
    @DisplayName("a crash is retried twice, then the item fails with a reason that says so")
    void crashIsRetriedThenFails() throws Exception {
        String id = this.requested("crash");
        AdminMediaItemDto item = this.await(id, Set.of("failed", "published"), Duration.ofSeconds(30));
        Assertions.assertThat(item.status()).isEqualTo("failed");
        Assertions.assertThat(item.failureReason()).contains("did not finish after 3 attempts").contains("(stage encode)");
        Assertions.assertThat(this.attempts(id)).isEqualTo(3);
    }

    @Test
    @DisplayName("a run past the timeout is stopped and retried; after the last, the item fails")
    void timeoutIsRetriedThenFails() throws Exception {
        String id = this.requested("hang");
        AdminMediaItemDto item = this.await(id, Set.of("failed", "published"), Duration.ofSeconds(40));
        Assertions.assertThat(item.status()).isEqualTo("failed");
        Assertions.assertThat(item.failureReason()).contains("still running after");
        Assertions.assertThat(this.attempts(id)).isEqualTo(3);
    }

    @Test
    @DisplayName("on startup, an item left processing with no completed after its latest requested is transcoded again")
    void resumesInterruptedWork() throws Exception {
        String id = this.admin.createMedia(new AdminMediaItemDto.Request(
            "song", "Interrupted", UUID.fromString(this.artistId), null, 60000, null, null, null, null, null, UUID.fromString(this.licenseId))).id();
        // The state a restart leaves: processing, its requested row already delivered, no completed.
        this.jdbc.update("UPDATE media_items SET status = 'processing', master_storage_key = ? WHERE id = ?",
            "masters/" + id + "/original.wav", UUID.fromString(id));
        UUID eventId = UUID.randomUUID();
        this.jdbc.update("""
            INSERT INTO outbox (event_id, aggregate_type, aggregate_id, event_type, payload, published_at)
            VALUES (?, 'media_item', ?, ?, ?::jsonb, now())
            """, eventId, id, Topics.AUDIO_TRANSCODE,
            "{\"kind\":\"requested\",\"event_id\":\"%s\",\"media_item_id\":\"%s\",\"media_type\":\"song\",\"master_storage_key\":\"masters/%s/original.wav\",\"ladder\":\"music_v1\",\"attempt\":1,\"requested_at\":\"2026-10-08T00:00:00Z\"}"
                .formatted(eventId, id, id));

        this.worker.resumeInterrupted();
        Assertions.assertThat(this.await(id, Set.of("published", "failed"), Duration.ofSeconds(30)).status()).isEqualTo("published");
    }
}
