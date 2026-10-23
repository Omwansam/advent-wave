package org.adventwave.catalog;

import java.time.Duration;
import lombok.Generated;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(
    prefix = "adventwave.catalog"
)
public class CatalogProperties {
    private String apiBaseUrl = "http://localhost:8080";
    private Duration signedUrlTtl = Duration.ofMinutes(5L);
    private double targetLufs = -14.0;
    private String signingSecret = "dev-only-playback-signing-secret-change-me";
    /**
     * Where a stored asset's bytes are fetched from: the derived bucket's CDN origin, set by
     * provisioning. Unset, it is {@code apiBaseUrl + "/media-storage"}, which answers only when
     * {@link #localMediaRoot} is set (drift A1 in contracts/audio/transcode.md).
     */
    private String mediaOriginUrl;
    /**
     * Local development only: a directory holding {@code derived/{id}/{profile}.m4a}, which the
     * gateway then serves itself at {@code /media-storage/derived/**}. Unset everywhere else.
     */
    private String localMediaRoot;
    /**
     * The web app's origin, which serves the placeholder covers at {@code /covers/} (RFC 0009,
     * advent-wave/public/covers/). A cover stored as a path starting with "/" is resolved against it.
     */
    private String coverBaseUrl = "http://localhost:5173";

    /** The base a storage key is appended to, with no trailing slash. */
    public String mediaOrigin() {
        String origin = this.mediaOriginUrl == null || this.mediaOriginUrl.isBlank()
            ? this.apiBaseUrl + "/media-storage"
            : this.mediaOriginUrl;
        return origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }

    @Generated
    public String getApiBaseUrl() {
        return this.apiBaseUrl;
    }

    @Generated
    public Duration getSignedUrlTtl() {
        return this.signedUrlTtl;
    }

    @Generated
    public double getTargetLufs() {
        return this.targetLufs;
    }

    @Generated
    public String getSigningSecret() {
        return this.signingSecret;
    }

    @Generated
    public String getMediaOriginUrl() {
        return this.mediaOriginUrl;
    }

    @Generated
    public String getLocalMediaRoot() {
        return this.localMediaRoot;
    }

    @Generated
    public String getCoverBaseUrl() {
        return this.coverBaseUrl;
    }

    @Generated
    public void setCoverBaseUrl(final String coverBaseUrl) {
        this.coverBaseUrl = coverBaseUrl;
    }

    @Generated
    public void setApiBaseUrl(final String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    @Generated
    public void setSignedUrlTtl(final Duration signedUrlTtl) {
        this.signedUrlTtl = signedUrlTtl;
    }

    @Generated
    public void setTargetLufs(final double targetLufs) {
        this.targetLufs = targetLufs;
    }

    @Generated
    public void setSigningSecret(final String signingSecret) {
        this.signingSecret = signingSecret;
    }

    @Generated
    public void setMediaOriginUrl(final String mediaOriginUrl) {
        this.mediaOriginUrl = mediaOriginUrl;
    }

    @Generated
    public void setLocalMediaRoot(final String localMediaRoot) {
        this.localMediaRoot = localMediaRoot;
    }
}
