package org.adventwave.events;

/**
 * A consumer of one topic. Implementations must be idempotent on {@link EventEnvelope#eventId()}:
 * delivery is at-least-once under Kafka, and the interim dispatcher makes no stronger promise
 * across restarts either.
 *
 * <p>The privacy rule applies to every handler that reads {@code playback.events.v1}, verbatim
 * from the plan: events with {@code private: true} must be excluded from listening history,
 * from recommendation features, and from the friend-activity feed.
 */
public interface EventHandler {
    /** The topic this handler consumes — one of the constants in {@code Topics}. */
    String topic();

    void handle(EventEnvelope envelope);
}
