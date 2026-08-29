package org.adventwave.contracts.events;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import org.adventwave.contracts.api.MediaType;

@JsonInclude(Include.NON_NULL)
public record PlaybackEvent(
    @JsonProperty("event_id") String eventId,
    @JsonProperty("user_id") String userId,
    @JsonProperty("media_item_id") String mediaItemId,
    @JsonProperty("media_type") MediaType mediaType,
    @JsonProperty("session_id") String sessionId,
    @JsonProperty("event_type") String eventType,
    @JsonProperty("ms_played") int msPlayed,
    @JsonProperty("duration_ms") int durationMs,
    @JsonProperty("counted") boolean counted,
    @JsonProperty("private") boolean privateSession,
    @JsonProperty("device") String device,
    @JsonProperty("client_ts") String clientTs,
    @JsonProperty("server_ts") String serverTs
) {
    public static final String PLAY_STARTED = "play_started";
    public static final String PLAY_PROGRESS = "play_progress";
    public static final String PLAY_COMPLETED = "play_completed";
    public static final String SKIPPED = "skipped";

    public static boolean isKnownEventType(String eventType) {
        return "play_started".equals(eventType) || "play_progress".equals(eventType) || "play_completed".equals(eventType) || "skipped".equals(eventType);
    }
}
