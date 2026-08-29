package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;

@Entity
@Table(
    name = "media_assets"
)
public class MediaAsset {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private UUID id = UUID.randomUUID();
    @Column(
        name = "media_item_id",
        nullable = false
    )
    private UUID mediaItemId;
    @Column(
        nullable = false
    )
    private String profile;
    @Column(
        nullable = false
    )
    private String codec;
    @Column(
        name = "bitrate_kbps",
        nullable = false
    )
    private short bitrateKbps;
    @Column(
        nullable = false
    )
    private String container = "m4a";
    @Column(
        name = "sample_rate_hz",
        nullable = false
    )
    private int sampleRateHz;
    @Column(
        nullable = false
    )
    private short channels;
    @Column(
        name = "storage_key",
        nullable = false
    )
    private String storageKey;
    @Column(
        name = "byte_size",
        nullable = false
    )
    private long byteSize;
    @Column(
        name = "checksum_sha256",
        nullable = false
    )
    private String checksumSha256;
    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    private Instant createdAt = Instant.now();

    @Generated
    public UUID getId() {
        return this.id;
    }

    @Generated
    public UUID getMediaItemId() {
        return this.mediaItemId;
    }

    @Generated
    public String getProfile() {
        return this.profile;
    }

    @Generated
    public String getCodec() {
        return this.codec;
    }

    @Generated
    public short getBitrateKbps() {
        return this.bitrateKbps;
    }

    @Generated
    public String getContainer() {
        return this.container;
    }

    @Generated
    public int getSampleRateHz() {
        return this.sampleRateHz;
    }

    @Generated
    public short getChannels() {
        return this.channels;
    }

    @Generated
    public String getStorageKey() {
        return this.storageKey;
    }

    @Generated
    public long getByteSize() {
        return this.byteSize;
    }

    @Generated
    public String getChecksumSha256() {
        return this.checksumSha256;
    }

    @Generated
    public Instant getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public void setId(final UUID id) {
        this.id = id;
    }

    @Generated
    public void setMediaItemId(final UUID mediaItemId) {
        this.mediaItemId = mediaItemId;
    }

    @Generated
    public void setProfile(final String profile) {
        this.profile = profile;
    }

    @Generated
    public void setCodec(final String codec) {
        this.codec = codec;
    }

    @Generated
    public void setBitrateKbps(final short bitrateKbps) {
        this.bitrateKbps = bitrateKbps;
    }

    @Generated
    public void setContainer(final String container) {
        this.container = container;
    }

    @Generated
    public void setSampleRateHz(final int sampleRateHz) {
        this.sampleRateHz = sampleRateHz;
    }

    @Generated
    public void setChannels(final short channels) {
        this.channels = channels;
    }

    @Generated
    public void setStorageKey(final String storageKey) {
        this.storageKey = storageKey;
    }

    @Generated
    public void setByteSize(final long byteSize) {
        this.byteSize = byteSize;
    }

    @Generated
    public void setChecksumSha256(final String checksumSha256) {
        this.checksumSha256 = checksumSha256;
    }

    @Generated
    public void setCreatedAt(final Instant createdAt) {
        this.createdAt = createdAt;
    }
}
