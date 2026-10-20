package org.adventwave.gateway.storage;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.gateway.audio.AudioProperties;
import org.adventwave.gateway.upload.MasterUploads;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

/**
 * Masters go straight from the contributor's browser to the masters bucket through a presigned
 * PUT (plan §11.7): a 200 MB WAV never passes through the gateway. The URL is signed for exactly
 * this key, content type and length, so it cannot be reused for another file.
 *
 * <p>The bucket needs a CORS rule allowing PUT from the admin portal's origin; deploy/README.md
 * has it.
 */
@Component
@ConditionalOnProperty(name = "adventwave.storage.mode", havingValue = "s3")
public class S3MasterUploads implements MasterUploads {
    private final S3Client s3;
    private final S3Presigner presigner;
    private final StorageProperties storage;
    private final AudioProperties audio;

    public S3MasterUploads(S3Client s3, S3Presigner presigner, StorageProperties storage, AudioProperties audio) {
        this.s3 = s3;
        this.presigner = presigner;
        this.storage = storage;
        this.audio = audio;
    }

    @Override
    public Optional<String> existingMaster(UUID mediaItemId) {
        String prefix = "masters/" + mediaItemId + "/original.";
        return this.s3.listObjectsV2(r -> r.bucket(this.storage.getS3().getMastersBucket()).prefix(prefix).maxKeys(1))
            .contents().stream().map(S3Object::key).findFirst();
    }

    @Override
    public Ticket issue(UUID mediaItemId, String masterStorageKey, String contentType, long sizeBytes) {
        PresignedPutObjectRequest signed = this.presigner.presignPutObject(p -> p
            .signatureDuration(this.audio.getUploadUrlTtl())
            .putObjectRequest(PutObjectRequest.builder()
                .bucket(this.storage.getS3().getMastersBucket())
                .key(masterStorageKey)
                .contentType(contentType)
                .contentLength(sizeBytes)
                .build()));
        return new Ticket(signed.url().toString(), signed.expiration() == null ? Instant.now().plus(this.audio.getUploadUrlTtl()) : signed.expiration());
    }
}
