package org.adventwave.gateway.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where masters and derived audio live (RFC 0006). {@code local}: one directory on this machine
 * (adventwave.catalog.local-media-root), for development. {@code s3}: S3-compatible object
 * storage — AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, MinIO — with uploads and
 * playback through presigned URLs, as plan §11.7 and §11.8 specify.
 */
@ConfigurationProperties(prefix = "adventwave.storage")
public class StorageProperties {
    private String mode = "local";
    private final S3 s3 = new S3();

    public boolean isS3() {
        return "s3".equals(this.mode);
    }

    public String getMode() { return this.mode; }
    public void setMode(String mode) { this.mode = mode; }
    public S3 getS3() { return this.s3; }

    public static class S3 {
        /** Blank for AWS itself; the provider's endpoint otherwise, e.g. https://{account}.r2.cloudflarestorage.com. */
        private String endpoint;
        /** AWS region, or what the provider asks for ("auto" for R2, the datacentre for Spaces). */
        private String region = "us-east-1";
        private String accessKey;
        private String secretKey;
        /** Masters: never served, never replaced; give it an archive lifecycle rule (plan §11.1). */
        private String mastersBucket;
        /** Derived files: served through presigned GETs only. Can be the same bucket as masters. */
        private String derivedBucket;
        /** bucket-in-path addressing, which MinIO and some providers need. */
        private boolean pathStyle;
        /** Where the transcode worker stages a master and its outputs, removed after each job. */
        private String stagingDir = System.getProperty("java.io.tmpdir") + "/adventwave-transcode";

        public String getEndpoint() { return this.endpoint; }
        public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
        public String getRegion() { return this.region; }
        public void setRegion(String region) { this.region = region; }
        public String getAccessKey() { return this.accessKey; }
        public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
        public String getSecretKey() { return this.secretKey; }
        public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
        public String getMastersBucket() { return this.mastersBucket; }
        public void setMastersBucket(String mastersBucket) { this.mastersBucket = mastersBucket; }
        public String getDerivedBucket() { return this.derivedBucket; }
        public void setDerivedBucket(String derivedBucket) { this.derivedBucket = derivedBucket; }
        public boolean isPathStyle() { return this.pathStyle; }
        public void setPathStyle(boolean pathStyle) { this.pathStyle = pathStyle; }
        public String getStagingDir() { return this.stagingDir; }
        public void setStagingDir(String stagingDir) { this.stagingDir = stagingDir; }
    }
}
