package org.adventwave.gateway.storage;

import java.net.URI;
import java.time.Duration;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.catalog.media.AssetUrls;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Wires storage by {@code adventwave.storage.mode} (RFC 0006). With {@code s3}: one S3 client and
 * one presigner, shared by uploads, playback URLs and the transcode worker. With {@code local}:
 * asset URLs are the media origin plus the key, as before.
 */
@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(name = "adventwave.storage.mode", havingValue = "local", matchIfMissing = true)
    AssetUrls originAssetUrls(CatalogProperties catalog) {
        return (storageKey, validFor) -> catalog.mediaOrigin() + "/" + storageKey;
    }

    @Configuration
    @ConditionalOnProperty(name = "adventwave.storage.mode", havingValue = "s3")
    static class S3Storage {
        @Bean(destroyMethod = "close")
        S3Client s3Client(StorageProperties storage) {
            StorageProperties.S3 s3 = require(storage);
            var builder = S3Client.builder()
                .region(Region.of(s3.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(s3.getAccessKey(), s3.getSecretKey())))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(s3.isPathStyle()).build())
                // Checksums only where the API requires them: several S3-compatible providers
                // reject the CRC32 headers newer SDKs add to every request by default.
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED);
            if (s3.getEndpoint() != null && !s3.getEndpoint().isBlank()) builder.endpointOverride(URI.create(s3.getEndpoint()));
            return builder.build();
        }

        @Bean(destroyMethod = "close")
        S3Presigner s3Presigner(StorageProperties storage) {
            StorageProperties.S3 s3 = require(storage);
            var builder = S3Presigner.builder()
                .region(Region.of(s3.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(s3.getAccessKey(), s3.getSecretKey())))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(s3.isPathStyle()).build());
            if (s3.getEndpoint() != null && !s3.getEndpoint().isBlank()) builder.endpointOverride(URI.create(s3.getEndpoint()));
            return builder.build();
        }

        /**
         * A presigned GET on the derived bucket. SigV4 caps a presigned URL at seven days; nothing
         * asks for more than a recording's length plus a margin.
         */
        @Bean
        AssetUrls s3AssetUrls(S3Presigner presigner, StorageProperties storage) {
            String bucket = storage.getS3().getDerivedBucket();
            Duration max = Duration.ofDays(7);
            return (storageKey, validFor) -> presigner.presignGetObject(p -> p
                    .signatureDuration(validFor.compareTo(max) > 0 ? max : validFor)
                    .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(storageKey).build()))
                .url().toString();
        }

        private static StorageProperties.S3 require(StorageProperties storage) {
            StorageProperties.S3 s3 = storage.getS3();
            StringBuilder missing = new StringBuilder();
            if (blank(s3.getAccessKey())) missing.append(" access-key (ADVENTWAVE_S3_ACCESS_KEY)");
            if (blank(s3.getSecretKey())) missing.append(" secret-key (ADVENTWAVE_S3_SECRET_KEY)");
            if (blank(s3.getMastersBucket())) missing.append(" masters-bucket (ADVENTWAVE_S3_MASTERS_BUCKET)");
            if (blank(s3.getDerivedBucket())) missing.append(" derived-bucket (ADVENTWAVE_S3_DERIVED_BUCKET)");
            if (!missing.isEmpty()) {
                throw new IllegalStateException("adventwave.storage.mode=s3 needs adventwave.storage.s3:" + missing);
            }
            return s3;
        }

        private static boolean blank(String s) {
            return s == null || s.isBlank();
        }
    }
}
