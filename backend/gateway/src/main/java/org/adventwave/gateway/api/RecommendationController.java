package org.adventwave.gateway.api;

import org.adventwave.contracts.api.RecommendationsDto;
import org.adventwave.gateway.assemble.RecommendationAssembler;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1"})
public class RecommendationController {
    private final RecommendationAssembler recommendations;

    public RecommendationController(RecommendationAssembler recommendations) {
        this.recommendations = recommendations;
    }

    @GetMapping({"/recommendations"})
    public RecommendationsDto recommendations(AuthenticatedUser caller) {
        return this.recommendations.forUser(caller.id());
    }
}
