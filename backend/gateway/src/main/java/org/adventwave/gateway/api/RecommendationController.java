package org.adventwave.gateway.api;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.AutoplayDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.RecommendationsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.gateway.assemble.RecommendationAssembler;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.reco.ContentBasedRecommender;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1"})
public class RecommendationController {
    private static final int MAX_SEEDS = 10;
    private static final int MAX_AUTOPLAY = 25;
    private static final int CANDIDATE_LIMIT = 500;
    private final RecommendationAssembler recommendations;
    private final CatalogService catalog;
    private final ContentBasedRecommender recommender;

    public RecommendationController(RecommendationAssembler recommendations, CatalogService catalog, ContentBasedRecommender recommender) {
        this.recommendations = recommendations;
        this.catalog = catalog;
        this.recommender = recommender;
    }

    @GetMapping({"/recommendations"})
    public RecommendationsDto recommendations(AuthenticatedUser caller) {
        return this.recommendations.forUser(caller.id());
    }

    /**
     * What to play when the queue runs out (RFC 0004): items of the first seed's media type, most
     * like the seeds first, the seeds excluded. The client sends the last few queue items. Seeded,
     * not personalised — nothing here reads listening history, so private session has nothing to
     * suppress. Unknown or unpublished seeds are ignored; if none is left there is nothing to
     * continue from, and the list is empty — the queue simply ends, as it did before autoplay.
     */
    @GetMapping({"/autoplay"})
    public AutoplayDto autoplay(@RequestParam("seed") List<UUID> seeds, @RequestParam(value = "limit", defaultValue = "10") int limit) {
        if (seeds.isEmpty() || seeds.size() > MAX_SEEDS) {
            throw new IllegalArgumentException("between 1 and " + MAX_SEEDS + " seeds");
        }
        if (limit < 1 || limit > MAX_AUTOPLAY) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_AUTOPLAY);
        }
        List<TrackDto> resolved = this.catalog.tracks(seeds);
        if (resolved.isEmpty()) {
            return new AutoplayDto(List.of());
        }
        MediaType type = resolved.get(0).mediaType();
        List<TrackDto> sameType = resolved.stream().filter(t -> t.mediaType() == type).toList();
        return new AutoplayDto(this.recommender.similarTo(sameType, this.catalog.byType(type, CANDIDATE_LIMIT), limit));
    }
}
