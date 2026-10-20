package org.adventwave.gateway.audio;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;
import java.util.stream.Stream;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.gateway.storage.StorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Where tools/transcode.py finds a master and leaves its outputs (RFC 0006). The tool works on one
 * directory holding masters/, derived/ and work/; this gives it one for each job.
 *
 * <p>Locally that is the media root itself, and nothing moves. With object storage it is a staging
 * directory: the master is downloaded into it first, every derived file is uploaded to the derived
 * bucket <em>before</em> the completed message is delivered — so an item can never publish ahead
 * of its audio — and the staged copies are removed afterwards.
 */
public interface TranscodeStorage {
    /** The --media-root for this job, with the master at the key the job names. */
    Path prepare(TranscodeJob job) throws IOException;

    /** After a {@code completed} message with status completed: put the outputs where players read them. */
    void publish(UUID mediaItemId, Path root, JsonNode message) throws IOException;

    /** After every attempt, successful or not. */
    void cleanup(UUID mediaItemId, Path root);

    @Configuration
    class Config {
        @Bean
        TranscodeStorage transcodeStorage(StorageProperties storage, CatalogProperties catalog, ObjectProvider<S3Client> s3) {
            if (storage.isS3()) return new S3(s3.getObject(), storage);
            if (catalog.getLocalMediaRoot() == null || catalog.getLocalMediaRoot().isBlank()) {
                // No storage the worker could use; LocalTranscodeWorker says so if it is enabled.
                return null;
            }
            Path root = Path.of(catalog.getLocalMediaRoot()).toAbsolutePath().normalize();
            return new TranscodeStorage() {
                @Override public Path prepare(TranscodeJob job) { return root; }
                @Override public void publish(UUID mediaItemId, Path r, JsonNode message) { }
                @Override public void cleanup(UUID mediaItemId, Path r) { }
            };
        }
    }

    final class S3 implements TranscodeStorage {
        private static final Logger log = LoggerFactory.getLogger(TranscodeStorage.class);
        private final S3Client s3;
        private final StorageProperties.S3 config;
        private final Path staging;

        S3(S3Client s3, StorageProperties storage) {
            this.s3 = s3;
            this.config = storage.getS3();
            this.staging = Path.of(this.config.getStagingDir()).toAbsolutePath().normalize();
        }

        @Override
        public Path prepare(TranscodeJob job) throws IOException {
            Path master = this.staging.resolve(job.masterStorageKey()).normalize();
            if (!master.startsWith(this.staging.resolve("masters"))) {
                throw new IOException(job.masterStorageKey() + " is not under masters/");
            }
            // A fresh copy of the master every attempt. work/ is left alone: transcode.py keeps its
            // per-item lock there, and a killed gateway's orphaned run may still hold it.
            this.removeTree(this.staging.resolve("masters").resolve(job.mediaItemId().toString()));
            Files.createDirectories(master.getParent());
            this.s3.getObject(r -> r.bucket(this.config.getMastersBucket()).key(job.masterStorageKey()), master);
            log.info("transcode {}: staged {} ({} bytes)", job.mediaItemId(), job.masterStorageKey(), Files.size(master));
            return this.staging;
        }

        @Override
        public void publish(UUID mediaItemId, Path root, JsonNode message) throws IOException {
            for (JsonNode asset : message.path("assets")) {
                String key = asset.path("storage_key").asText();
                Path file = root.resolve(key).normalize();
                if (!file.startsWith(root.resolve("derived").resolve(mediaItemId.toString())) || !Files.isRegularFile(file)) {
                    throw new IOException("the tool reported " + key + " but left no such file");
                }
                this.s3.putObject(r -> r
                        .bucket(this.config.getDerivedBucket())
                        .key(key)
                        .contentType("audio/mp4")
                        // Keys are deterministic and a re-transcode rewrites them whole, so a
                        // player may keep what it fetched: the bytes behind a key do not change.
                        .cacheControl("private, max-age=31536000, immutable"),
                    RequestBody.fromFile(file));
            }
            log.info("transcode {}: {} derived file(s) uploaded", mediaItemId, message.path("assets").size());
        }

        @Override
        public void cleanup(UUID mediaItemId, Path root) {
            this.removeTree(root.resolve("masters").resolve(mediaItemId.toString()));
            this.removeTree(root.resolve("derived").resolve(mediaItemId.toString()));
        }

        private void removeTree(Path dir) {
            if (!Files.exists(dir)) return;
            try (Stream<Path> walk = Files.walk(dir)) {
                walk.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
            } catch (IOException e) {
                log.warn("could not remove staged {}: {}", dir, e.getMessage());
            }
        }
    }
}
