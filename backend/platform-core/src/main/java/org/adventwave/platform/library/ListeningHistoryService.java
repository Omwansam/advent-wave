package org.adventwave.platform.library;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.adventwave.platform.domain.ListeningHistoryEntry;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ListeningHistoryService {
    public static final int MAX_RECENT = 100;
    private final PlatformRepositories.ListeningHistoryRepository repository;
    private final PlatformRepositories.ListenerActivityRepository activity;

    public ListeningHistoryService(PlatformRepositories.ListeningHistoryRepository repository, PlatformRepositories.ListenerActivityRepository activity) {
        this.repository = repository;
        this.activity = activity;
    }

    @Transactional
    public void record(UUID userId, UUID mediaItemId, int msPlayed, boolean completed, UUID sessionId, String device) {
        ListeningHistoryEntry listeninghistoryentry = this.repository
            .findByUserIdAndMediaItemId(userId, mediaItemId)
            .orElseGet(() -> new ListeningHistoryEntry(userId, mediaItemId));
        listeninghistoryentry.setPlayedAt(Instant.now());
        listeninghistoryentry.setMsPlayed(Math.max(listeninghistoryentry.getMsPlayed(), msPlayed));
        listeninghistoryentry.setCompleted(listeninghistoryentry.isCompleted() || completed);
        listeninghistoryentry.setSessionId(sessionId);
        listeninghistoryentry.setDevice(device);
        this.repository.save(listeninghistoryentry);
        this.repository.trimToNewest(userId, 100);
    }

    @Transactional(
        readOnly = true
    )
    public List<LibrarySnapshot.HistoryRow> recent(UUID userId, int limit) {
        return this.repository
            .findByUserIdOrderByPlayedAtDesc(userId)
            .stream()
            .limit(Math.min(limit, 100))
            .map(e -> new LibrarySnapshot.HistoryRow(e.getMediaItemId(), e.getPlayedAt().toEpochMilli()))
            .toList();
    }

    @Transactional
    public void clear(UUID userId) {
        this.repository.deleteByUserId(userId);
        // What friends see is the newest history entry by another name (RFC 0007).
        this.activity.clear(userId);
    }
}
