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
}
