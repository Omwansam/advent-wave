package org.adventwave.contracts.events;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PlayCountingPolicyTest {
    private static final int FOUR_MINUTE_SONG = 240000;
    private static final int FORTY_FIVE_MINUTE_SERMON = 2700000;

    @Test
    @DisplayName("30 seconds counts, one millisecond short does not")
    void thirtySecondThreshold() {
        Assertions.assertThat(PlayCountingPolicy.counts(30000L, 240000L)).isTrue();
        Assertions.assertThat(PlayCountingPolicy.counts(29999L, 240000L)).isFalse();
    }

    @Test
    @DisplayName("half of a short track counts before 30 seconds elapse")
    void halfDurationThreshold() {
        int i = 20000;
        Assertions.assertThat(PlayCountingPolicy.counts(10000L, i)).isTrue();
        Assertions.assertThat(PlayCountingPolicy.counts(9999L, i)).isFalse();
    }

    @Test
    @DisplayName("a 45-minute sermon counts at 30 seconds, long before half of it is played")
    void longFormUsesTheAbsoluteThreshold() {
        Assertions.assertThat(PlayCountingPolicy.counts(30000L, 2700000L)).isTrue();
    }

    @Test
    @DisplayName("zero and negative playback never count")
    void nonPositivePlaybackNeverCounts() {
        Assertions.assertThat(PlayCountingPolicy.counts(0L, 240000L)).isFalse();
        Assertions.assertThat(PlayCountingPolicy.counts(-1L, 240000L)).isFalse();
    }

    @Test
    @DisplayName("an unknown duration falls back to the absolute threshold alone")
    void unknownDuration() {
        Assertions.assertThat(PlayCountingPolicy.counts(30000L, 0L)).isTrue();
        Assertions.assertThat(PlayCountingPolicy.counts(5000L, 0L)).isFalse();
    }

    @Test
    @DisplayName("counted and completed are different questions")
    void completionIsNotCounting() {
        Assertions.assertThat(PlayCountingPolicy.counts(120000L, 2700000L)).isTrue();
        Assertions.assertThat(PlayCountingPolicy.isCompleted(120000L, 2700000L)).isFalse();
        Assertions.assertThat(PlayCountingPolicy.isCompleted(2600000L, 2700000L)).isTrue();
    }
}
