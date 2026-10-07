package org.adventwave.gateway.api;

import java.nio.file.Path;
import org.adventwave.catalog.CatalogProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Local development's stand-in for the derived bucket's CDN origin (drift A1 in
 * contracts/audio/transcode.md). With {@code adventwave.catalog.local-media-root} set, the gateway
 * serves {@code {root}/derived/} at {@code /media-storage/derived/**}: whole files with HTTP range
 * requests, which is all the player needs. Only derived/ is mapped; the masters and the worker's
 * work/ directory beside it are never reachable.
 *
 * <p>Unauthenticated, like a CDN origin: the playback URL's HMAC was verified before the 302 that
 * lands here, and a media player cannot attach a token to a redirect. Without the property no
 * handler is registered and {@link org.adventwave.gateway.security.SecurityConfig} does not open
 * the path.
 */
@Configuration
public class LocalMediaOriginConfig implements WebMvcConfigurer {
    public static final String PATH = "/media-storage/derived/**";

    private final CatalogProperties properties;

    public LocalMediaOriginConfig(CatalogProperties properties) {
        this.properties = properties;
    }

    public static boolean enabled(CatalogProperties properties) {
        return properties.getLocalMediaRoot() != null && !properties.getLocalMediaRoot().isBlank();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (!enabled(this.properties)) return;
        String derived = Path.of(this.properties.getLocalMediaRoot(), "derived").toAbsolutePath().normalize().toUri().toString();
        // a location without the trailing slash is taken as a file, not a directory
        registry.addResourceHandler(PATH).addResourceLocations(derived.endsWith("/") ? derived : derived + "/");
    }
}
