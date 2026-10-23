package org.adventwave.gateway.api;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.ArtistDirectory;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.ArtistsDto;
import org.adventwave.contracts.api.ConferencesDto;
import org.adventwave.contracts.api.Ensemble;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Churches, choirs and ministries (RFC 0009): the rows of profiles a listener browses, and the
 * church's structure in Kenya to browse them by. One profile's page stays
 * {@code GET /v1/artists/{id}} (MediaController).
 */
@RestController
@RequestMapping({"/v1"})
public class ProfileController {
    private static final int DEFAULT_LIMIT = 24;
    private static final int MAX_LIMIT = 100;
    private final CatalogService catalog;

    public ProfileController(CatalogService catalog) {
        this.catalog = catalog;
    }

    /**
     * Profiles with something to hear, the most listened to over 30 days first. {@code kind} is
     * one or more of church, choir, group, soloist, preacher, ministry (comma-separated);
     * {@code ensemble} narrows choirs; {@code independent=true} keeps choirs, groups and singers
     * with no home church; {@code church} keeps one church's members; {@code conference} may name a
     * union, which includes its conferences and fields.
     */
    @GetMapping({"/artists"})
    public ArtistsDto artists(
        @RequestParam(required = false) List<String> kind,
        @RequestParam(required = false) String ensemble,
        @RequestParam(required = false) Boolean independent,
        @RequestParam(required = false) UUID church,
        @RequestParam(required = false) String conference,
        @RequestParam(required = false) Integer limit
    ) {
        int n = limit == null ? DEFAULT_LIMIT : limit;
        if (n < 1 || n > MAX_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_LIMIT);
        }

        List<ArtistKind> kinds = kind == null ? List.of() : kind.stream().filter(k -> !k.isBlank()).map(String::trim).map(ArtistKind::fromWire).toList();
        Ensemble e = ensemble == null || ensemble.isBlank() ? null : Ensemble.fromWire(ensemble.trim());
        String c = conference == null || conference.isBlank() ? null : conference.trim();
        return this.catalog.artists(new ArtistDirectory.Filter(kinds, e, independent, church, c), n);
    }

    /** The union conferences in Kenya, each with its conferences and fields and how many churches each has here. */
    @GetMapping({"/conferences"})
    public ConferencesDto conferences() {
        return this.catalog.conferences();
    }
}
