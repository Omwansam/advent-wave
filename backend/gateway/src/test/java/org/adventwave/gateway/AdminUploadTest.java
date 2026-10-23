package org.adventwave.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.contracts.api.admin.ChurchDto;
import org.adventwave.contracts.api.admin.LicenseDto;
import org.adventwave.gateway.admin.CatalogAdminService;
import org.adventwave.gateway.security.admin.AdminAccountRepository;
import org.adventwave.gateway.security.admin.AdminRole;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Master upload (RFC 0001, plan §11.7): the admin API issues a signed URL, the bytes go straight
 * to it, and the result is a master that is never replaced and never served.
 */
@AutoConfigureMockMvc
class AdminUploadTest extends IntegrationTest {
    static final Path ROOT;
    static final byte[] MASTER = "RIFF....WAVEfmt not really audio, but bytes are bytes".getBytes(StandardCharsets.US_ASCII);

    static {
        try {
            ROOT = Files.createTempDirectory("upload-root");
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
    AdminAccountRepository accounts;
    @Autowired
    CatalogAdminService admin;
    @Autowired
    JdbcTemplate jdbc;

    private String token;
    private String itemId;

    @BeforeEach
    void setUp() throws Exception {
        this.token = AdminTestSupport.token(this.mvc, this.accounts, AdminRole.CONTENT_MANAGER);
        ChurchDto church = this.admin.createChurch(new ChurchDto.Request("Upload Church " + UUID.randomUUID(), "KE", "kenya", null));
        String licence = this.admin.createLicense(new LicenseDto.Request(UUID.fromString(church.id()), null, null, null, null)).id();
        String artist = this.admin.createArtist(new AdminArtistDto.Request("Upload Choir " + UUID.randomUUID(), null, null, null, UUID.fromString(church.id()), null, null, null, null, null, null)).id();
        this.itemId = this.admin.createMedia(new AdminMediaItemDto.Request(
            "song", "Upload Song", UUID.fromString(artist), null, 1000, null, null, null, null, null, UUID.fromString(licence))).id();
    }

    private org.springframework.test.web.servlet.ResultActions requestUpload(String id, String body) throws Exception {
        return this.mvc.perform(post("/v1/admin/media/{id}/upload", id)
            .header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(this.token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
    }

    private String uploadUrl() throws Exception {
        String body = this.requestUpload(this.itemId,
                "{\"filename\":\"Choir Take 3.WAV\",\"contentType\":\"audio/wav\",\"sizeBytes\":" + MASTER.length + "}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.method").value("PUT"))
            .andExpect(jsonPath("$.masterStorageKey").value("masters/" + this.itemId + "/original.wav"))
            .andReturn().getResponse().getContentAsString();
        String url = AdminTestSupport.json(body).path("uploadUrl").asText();
        Assertions.assertThat(url).contains("/v1/uploads/" + this.itemId + "?key=");
        return URI.create(url).getRawPath() + "?" + URI.create(url).getRawQuery();
    }

    @Test
    @DisplayName("issue a URL, PUT the bytes without a token, and the master lands at its key; then transcode from it")
    void uploadThenTranscode() throws Exception {
        String target = this.uploadUrl();
        this.mvc.perform(put(URI.create(target)).contentType("audio/wav").content(MASTER))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.masterStorageKey").value("masters/" + this.itemId + "/original.wav"))
            .andExpect(jsonPath("$.byteSize").value(MASTER.length));
        Path stored = ROOT.resolve("masters/" + this.itemId + "/original.wav");
        Assertions.assertThat(Files.readAllBytes(stored)).isEqualTo(MASTER);
        Assertions.assertThat(Files.list(stored.getParent())).hasSize(1);

        this.mvc.perform(post("/v1/admin/media/{id}/transcode", this.itemId)
                .header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(this.token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"masterStorageKey\":\"masters/" + this.itemId + "/original.wav\"}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("processing"));
    }

    @Test
    @DisplayName("a master is never replaced: a second URL is refused, and so is a second PUT")
    void mastersAreNeverReplaced() throws Exception {
        String target = this.uploadUrl();
        this.mvc.perform(put(URI.create(target)).content(MASTER)).andExpect(status().isCreated());
        this.requestUpload(this.itemId, "{\"filename\":\"again.flac\",\"sizeBytes\":10}")
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("masters are never replaced")));
        this.mvc.perform(put(URI.create(target)).content("other bytes".getBytes(StandardCharsets.US_ASCII)))
            .andExpect(status().isConflict());
        Assertions.assertThat(Files.readAllBytes(ROOT.resolve("masters/" + this.itemId + "/original.wav"))).isEqualTo(MASTER);
    }

    @Test
    @DisplayName("unaccepted extensions and oversized files are 400; an item past draft or failed is 409")
    void refusals() throws Exception {
        this.requestUpload(this.itemId, "{\"filename\":\"sermon.docx\",\"sizeBytes\":10}").andExpect(status().isBadRequest());
        this.requestUpload(this.itemId, "{\"filename\":\"long.wav\",\"sizeBytes\":5000000000}").andExpect(status().isBadRequest());
        this.requestUpload(this.itemId, "{\"filename\":\"zero.wav\",\"sizeBytes\":0}").andExpect(status().isBadRequest());
        String published = this.jdbc.queryForObject("SELECT id::text FROM media_items WHERE status = 'published' LIMIT 1", String.class);
        this.requestUpload(published, "{\"filename\":\"a.wav\",\"sizeBytes\":10}").andExpect(status().isConflict());
    }

    @Test
    @DisplayName("an altered signature and an expired URL are both 403, and nothing is written")
    void signatures() throws Exception {
        String target = this.uploadUrl();
        this.mvc.perform(put(URI.create(target.replaceAll("sig=[^&]+", "sig=AAAA"))).content(MASTER)).andExpect(status().isForbidden());

        String key = "masters/" + this.itemId + "/original.wav";
        long past = Instant.now().minusSeconds(60).getEpochSecond();
        String expired = "/v1/uploads/" + this.itemId + "?key=" + key.replace("/", "%2F") + "&exp=" + past + "&sig=" + sign(this.itemId, key, past);
        this.mvc.perform(put(URI.create(expired)).content(MASTER)).andExpect(status().isForbidden());

        Assertions.assertThat(ROOT.resolve("masters/" + this.itemId)).doesNotExist();
    }

    @Test
    @DisplayName("a master labelled as a form is stored as bytes, never parsed as one")
    void formLabelledBodyIsNotParsed() throws Exception {
        // curl's default for --data-binary. With Spring's FormContentFilter on, the whole body was
        // read into memory before authentication and decoded as a form, and binary audio failed to
        // decode ("%zz"), so the upload ended as an error instead of a stored master.
        byte[] binary = "RIFF\u0000%zz&key=x&sig=yÿ not a form".getBytes(StandardCharsets.ISO_8859_1);
        this.mvc.perform(put(URI.create(this.uploadUrl())).contentType(MediaType.APPLICATION_FORM_URLENCODED).content(binary))
            .andExpect(status().isCreated());
        Assertions.assertThat(Files.readAllBytes(ROOT.resolve("masters/" + this.itemId + "/original.wav"))).isEqualTo(binary);
    }

    @Test
    @DisplayName("masters are not served, signed URL or not")
    void mastersAreNotServed() throws Exception {
        this.mvc.perform(put(URI.create(this.uploadUrl())).content(MASTER)).andExpect(status().isCreated());
        this.mvc.perform(get("/media-storage/masters/{id}/original.wav", this.itemId)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("issuing an upload URL needs media:write: 401 without a token, 403 for a listener or a viewer")
    void needsPermission() throws Exception {
        String body = "{\"filename\":\"a.wav\",\"sizeBytes\":10}";
        this.mvc.perform(post("/v1/admin/media/{id}/upload", this.itemId).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
        this.mvc.perform(post("/v1/admin/media/{id}/upload", this.itemId)
                .header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(AdminTestSupport.listenerToken(this.mvc)))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        this.mvc.perform(post("/v1/admin/media/{id}/upload", this.itemId)
                .header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(AdminTestSupport.token(this.mvc, this.accounts, AdminRole.VIEWER)))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("with the local media origin, preview lists one URL per stored asset, whatever the status")
    void preview() throws Exception {
        this.mvc.perform(get("/v1/admin/media/{id}/preview", this.itemId).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(this.token)))
            .andExpect(status().isOk())
            .andExpect(content().json("{}"));
        this.jdbc.update("""
            INSERT INTO media_assets (media_item_id, profile, codec, bitrate_kbps, sample_rate_hz, channels, storage_key, byte_size, checksum_sha256)
            VALUES (?, 'aac_96', 'aac-lc', 96, 44100, 2, ?, 4096, 'test')
            """, UUID.fromString(this.itemId), "derived/" + this.itemId + "/aac_96.m4a");
        this.mvc.perform(get("/v1/admin/media/{id}/preview", this.itemId).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(this.token)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aac_96").value("http://localhost:8080/media-storage/derived/" + this.itemId + "/aac_96.m4a"));
    }

    /** LocalMasterUploads' signature, with application.yml's default upload secret. */
    private static String sign(String id, String key, long exp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("dev-only-upload-signing-secret-change-me".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal((id + "|" + key + "|" + exp).getBytes(StandardCharsets.UTF_8)));
    }
}
