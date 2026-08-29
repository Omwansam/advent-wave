package org.adventwave.contracts.events;

public final class PlayCountingPolicy {
    public static final long MIN_MS_PLAYED = 30000L;
    public static final double MIN_FRACTION_OF_DURATION = 0.5;

    private PlayCountingPolicy() {
    }

    public static boolean counts(long msPlayed, long durationMs) {
        if (msPlayed <= 0L) {
            return false;
        } else {
            return msPlayed >= 30000L ? true : durationMs > 0L && msPlayed >= durationMs * 0.5;
        }
    }

    public static boolean isCompleted(long msPlayed, long durationMs) {
        return durationMs > 0L && msPlayed >= durationMs * 0.95;
    }
}
