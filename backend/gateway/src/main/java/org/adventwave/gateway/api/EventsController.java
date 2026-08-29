package org.adventwave.gateway.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.adventwave.contracts.events.PlaybackEvent;
import org.adventwave.gateway.events.PlaybackIngestService;
import org.adventwave.gateway.events.RateLimiter;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/v1/events"})
public class EventsController {
    private static final String ROUTE = "events-playback";
    private final PlaybackIngestService ingest;
    private final RateLimiter rateLimiter;
    private final int limitPerMinute;

    public EventsController(PlaybackIngestService ingest, RateLimiter rateLimiter, @Value("${adventwave.events.playback-per-minute:240}") int limitPerMinute) {
        this.ingest = ingest;
        this.rateLimiter = rateLimiter;
        this.limitPerMinute = limitPerMinute;
    }

    @PostMapping({"/playback"})
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PlaybackEvent playback(AuthenticatedUser caller, @Valid @RequestBody EventsController.PlaybackSubmission submission) {
        if (!this.rateLimiter.allow(caller.id(), "events-playback", this.limitPerMinute)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "too many playback events; slow down");
        } else {
            return this.ingest
                .ingest(
                    caller.id(),
                    new PlaybackIngestService.Submission(
                        submission.eventId(),
                        submission.mediaItemId(),
                        submission.sessionId(),
                        submission.eventType(),
                        submission.msPlayed(),
                        submission.device(),
                        submission.clientTs()
                    )
                );
        }
    }

    public record PlaybackSubmission(
        String eventId, @NotNull UUID mediaItemId, UUID sessionId, @NotBlank String eventType, @Min(0L) int msPlayed, String device, String clientTs
    ) {
    }
}
