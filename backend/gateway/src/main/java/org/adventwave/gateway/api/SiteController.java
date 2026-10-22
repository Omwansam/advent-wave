package org.adventwave.gateway.api;

import java.time.Duration;
import org.adventwave.contracts.api.SiteDto;
import org.adventwave.gateway.assemble.SiteAssembler;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The public website's one read (RFC 0008). Open to anyone, from any origin (SecurityConfig):
 * it carries only what the site shows, and nothing about a listener.
 */
@RestController
@RequestMapping({"/v1"})
public class SiteController {
    /** Browsers may keep it for five minutes; the gateway's own copy lives in Redis (SiteCache). */
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(5L)).cachePublic().staleWhileRevalidate(Duration.ofMinutes(10L));
    private final SiteAssembler site;

    public SiteController(SiteAssembler site) {
        this.site = site;
    }

    @GetMapping({"/site"})
    public ResponseEntity<SiteDto> site() {
        return ResponseEntity.ok().cacheControl(CACHE).body(this.site.assemble());
    }
}
