package org.adventwave.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;
import org.adventwave.catalog.media.StreamService;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Drift A1's local correction (contracts/audio/transcode.md): with a local media root configured,
 * the gateway is the origin a signed playback URL redirects to. It serves derived/ to a player that
 * has no token, honours range requests, and never reaches the masters beside it.
 */
@AutoConfigureMockMvc
class LocalMediaOriginTest extends IntegrationTest {
    static final Path ROOT;
    static final UUID ITEM = UUID.randomUUID();
    static final byte[] AUDIO = new byte[4096];

    static {
        for (int i = 0; i < AUDIO.length; i++) AUDIO[i] = (byte) i;
        try {
            ROOT = Files.createTempDirectory("media-root");
            Files.createDirectories(ROOT.resolve("derived/" + ITEM));
            Files.write(ROOT.resolve("derived/" + ITEM + "/aac_96.m4a"), AUDIO);
            Files.createDirectories(ROOT.resolve("masters/" + ITEM));
            Files.write(ROOT.resolve("masters/" + ITEM + "/original.wav"), AUDIO);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void mediaRoot(DynamicPropertyRegistry registry) {
        registry.add("adventwave.catalog.local-media-root", ROOT::toString);
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    StreamService stream;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    @DisplayName("derived assets are served without a token, as audio/mp4")
    void servesDerived() throws Exception {
        this.mvc.perform(get("/media-storage/derived/{id}/aac_96.m4a", ITEM))
            .andExpect(status().isOk())
            .andExpect(content().contentType("audio/mp4"))
            .andExpect(header().string("Accept-Ranges", "bytes"))
            .andExpect(content().bytes(AUDIO));
        this.mvc.perform(head("/media-storage/derived/{id}/aac_96.m4a", ITEM))
            .andExpect(status().isOk())
            .andExpect(header().longValue("Content-Length", AUDIO.length));
    }

    @Test
    @DisplayName("a range request gets 206 and exactly the bytes asked for, which is what seeking needs")
    void honoursRanges() throws Exception {
        this.mvc.perform(get("/media-storage/derived/{id}/aac_96.m4a", ITEM).header("Range", "bytes=100-199"))
            .andExpect(status().isPartialContent())
            .andExpect(header().string("Content-Range", "bytes 100-199/" + AUDIO.length))
            .andExpect(content().bytes(Arrays.copyOfRange(AUDIO, 100, 200)));
    }

    @Test
    @DisplayName("masters are never served, directly or by walking out of derived/")
    void neverServesMasters() throws Exception {
        this.mvc.perform(get("/media-storage/masters/{id}/original.wav", ITEM))
            .andExpect(status().isUnauthorized());
        int status;
        try {
            status = this.mvc.perform(get(URI.create("/media-storage/derived/../masters/" + ITEM + "/original.wav")))
                .andReturn().getResponse().getStatus();
        } catch (Exception rejectedByTheFirewall) {
            status = 400;
        }
        Assertions.assertThat(status).isGreaterThanOrEqualTo(400);
    }

    @Test
    @DisplayName("a stored asset's playback URL points at the media origin")
    void playbackUrlUsesTheMediaOrigin() {
        UUID item = this.jdbc.queryForObject("""
            SELECT id FROM media_items m
            WHERE status = 'published'
              AND NOT EXISTS (SELECT 1 FROM media_assets a WHERE a.media_item_id = m.id)
            LIMIT 1
            """, UUID.class);
        this.jdbc.update("""
            INSERT INTO media_assets (media_item_id, profile, codec, bitrate_kbps, sample_rate_hz, channels,
                                      storage_key, byte_size, checksum_sha256)
            VALUES (?, 'aac_96', 'aac-lc', 96, 44100, 2, ?, 4096, 'test')
            """, item, "derived/" + item + "/aac_96.m4a");
        try {
            Assertions.assertThat(this.stream.resolvePlaybackUrl(item, "aac_96", "normal"))
                .contains("http://localhost:8080/media-storage/derived/" + item + "/aac_96.m4a");
        } finally {
            this.jdbc.update("DELETE FROM media_assets WHERE media_item_id = ?", item);
        }
    }
}
