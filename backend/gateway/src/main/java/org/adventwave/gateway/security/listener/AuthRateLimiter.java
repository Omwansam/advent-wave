package org.adventwave.gateway.security.listener;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * A sliding-window counter for the unauthenticated auth endpoints (RFC 0005), keyed by client
 * address and action: credential stuffing across many accounts from one address, and mass
 * registration, which per-account lockout does not see.
 *
 * <p>In memory, on purpose. It must work with Redis down (Redis is never a source of truth), and
 * the gateway is one process on one server; a second instance would need this moved to Redis.
 * Behind a proxy the client address is right only with server.forward-headers-strategy set.
 */
@Component
public class AuthRateLimiter {
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    /** Records an attempt and says whether it is within {@code max} per {@code window}. */
    public boolean allow(String key, int max, Duration window) {
        long now = System.currentTimeMillis();
        long since = now - window.toMillis();
        Deque<Long> times = this.hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < since) times.pollFirst();
            if (times.size() >= max) return false;
            times.addLast(now);
            return true;
        }
    }

    /** Forgets addresses that have gone quiet, so the map does not grow with every visitor. */
    @Scheduled(fixedDelay = 600_000)
    void prune() {
        long cutoff = System.currentTimeMillis() - Duration.ofHours(2).toMillis();
        this.hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || e.getValue().peekLast() < cutoff;
            }
        });
    }
}
