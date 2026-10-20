package org.adventwave.platform.player;

import java.util.List;
import java.util.UUID;
import org.adventwave.platform.domain.ListeningProgress;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Per-item resume points for sermons and podcast episodes (RFC 0003). Which items qualify is
 * the caller's check — this service stores what it is given.
 *
 * <p>Deliberately outside the private-session rule and the outbox: a resume point is shown only
 * to its owner and feeds nothing, so it is neither listening history nor library state.
 */
@Service
public class ListeningProgressService {
    /** Per listener. Older rows are dropped on write; nobody resumes the sermon from 500 ago. */
    public static final int MAX_ROWS = 500;
    private final PlatformRepositories.ListeningProgressRepository repository;

    public ListeningProgressService(PlatformRepositories.ListeningProgressRepository repository) {
        this.repository = repository;
    }

    /** Most recently updated first. */
    @Transactional(
        readOnly = true
    )
    public List<ListeningProgress> list(UUID userId) {
        return this.repository.findByIdUserIdOrderByUpdatedAtDesc(userId, Limit.of(MAX_ROWS));
    }

    @Transactional
    public ListeningProgress save(UUID userId, UUID mediaItemId, int positionMs, boolean completed) {
        this.repository.upsert(userId, mediaItemId, Math.max(0, positionMs), completed);
        this.repository.trimToNewest(userId, MAX_ROWS);
        return this.repository
            .findById(new ListeningProgress.Key(userId, mediaItemId))
            .orElseThrow(() -> new IllegalStateException("listening progress row missing straight after its upsert"));
    }
}
