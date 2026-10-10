package org.adventwave.gateway.audio;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

/**
 * Master uploads and the local transcode worker (RFC 0001). Everything here is workstream D's
 * seam as it runs on one machine; in production the upload URL comes from object storage and the
 * worker is its own service consuming {@code audio.transcode.v1}.
 */
@ConfigurationProperties(prefix = "adventwave.audio")
public class AudioProperties {
    /**
     * Runs {@link LocalTranscodeWorker} in this process. True only in application-local.yml:
     * anywhere else the worker is a separate service, and two consumers would transcode twice.
     */
    private boolean localWorkerEnabled = false;
    /** backend/tools/transcode.py, relative to the working directory, which is backend/gateway under spring-boot:run. */
    private String transcodeScript = "../tools/transcode.py";
    /** The interpreter that runs the script. */
    private String python = "python3";
    /** A run still going after this is stopped and retried. Long recordings take minutes; ffmpeg already uses every core. */
    private Duration transcodeTimeout = Duration.ofMinutes(60);
    /**
     * Waits before attempt 2, attempt 3, …; its length + 1 is the attempt count. Only crashes,
     * timeouts and unreadable output are retried: a failure the tool reports is final.
     */
    private List<Duration> retryBackoff = List.of(Duration.ofSeconds(30), Duration.ofMinutes(2));
    /** The largest master an upload URL is issued for, and the largest the local endpoint accepts. */
    private DataSize maxUploadBytes = DataSize.ofGigabytes(4);
    /** How long an issued upload URL stays valid. */
    private Duration uploadUrlTtl = Duration.ofMinutes(10);
    /** HMAC key for local upload URLs. Separate from the playback signing secret: different capability, different key. */
    private String uploadSigningSecret = "dev-only-upload-signing-secret-change-me";

    public boolean isLocalWorkerEnabled() { return this.localWorkerEnabled; }
    public void setLocalWorkerEnabled(boolean localWorkerEnabled) { this.localWorkerEnabled = localWorkerEnabled; }
    public String getTranscodeScript() { return this.transcodeScript; }
    public void setTranscodeScript(String transcodeScript) { this.transcodeScript = transcodeScript; }
    public String getPython() { return this.python; }
    public void setPython(String python) { this.python = python; }
    public Duration getTranscodeTimeout() { return this.transcodeTimeout; }
    public void setTranscodeTimeout(Duration transcodeTimeout) { this.transcodeTimeout = transcodeTimeout; }
    public List<Duration> getRetryBackoff() { return this.retryBackoff; }
    public void setRetryBackoff(List<Duration> retryBackoff) { this.retryBackoff = retryBackoff; }
    public DataSize getMaxUploadBytes() { return this.maxUploadBytes; }
    public void setMaxUploadBytes(DataSize maxUploadBytes) { this.maxUploadBytes = maxUploadBytes; }
    public Duration getUploadUrlTtl() { return this.uploadUrlTtl; }
    public void setUploadUrlTtl(Duration uploadUrlTtl) { this.uploadUrlTtl = uploadUrlTtl; }
    public String getUploadSigningSecret() { return this.uploadSigningSecret; }
    public void setUploadSigningSecret(String uploadSigningSecret) { this.uploadSigningSecret = uploadSigningSecret; }
}
