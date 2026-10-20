package org.adventwave.platform.social;

import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.adventwave.platform.domain.ListenerActivity;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.domain.UserFollow;
import org.adventwave.platform.outbox.OutboxWriter;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listeners following one another, and what the people you follow are playing (RFC 0007).
 *
 * <p>Only a display name and the last item played ever leave an account: never an email, never
 * history. Activity is written only outside a private session and while sharing is on, and every
 * read filters on both again, so a setting changed a moment ago is honoured at once.
 */
@Service
public class FriendService {
    /** The friends list is not paged: it holds the people followed most recently, up to this many. */
    public static final int MAX_FRIENDS = 200;
    public static final int MAX_SEARCH = 50;
    public static final int MIN_QUERY = 2;
    private final PlatformRepositories.UserAccountRepository users;
    private final PlatformRepositories.UserFollowUserRepository follows;
    private final PlatformRepositories.ListenerActivityRepository activity;
    private final OutboxWriter outbox;

    public FriendService(
        PlatformRepositories.UserAccountRepository users,
        PlatformRepositories.UserFollowUserRepository follows,
        PlatformRepositories.ListenerActivityRepository activity,
        OutboxWriter outbox
    ) {
        this.users = users;
        this.follows = follows;
        this.activity = activity;
        this.outbox = outbox;
    }

    @Transactional(
        readOnly = true
    )
    public boolean exists(UUID userId) {
        return this.users.existsById(userId);
    }

    @Transactional
    public boolean toggleFollow(UUID userId, UUID followeeId) {
        if (userId.equals(followeeId)) {
            throw new IllegalArgumentException("you cannot follow yourself");
        }

        UserFollow.Key key = new UserFollow.Key(userId, followeeId);
        boolean following;
        if (this.follows.existsById(key)) {
            this.follows.deleteById(key);
            following = false;
        } else {
            this.follows.save(new UserFollow.Listener(userId, followeeId));
            following = true;
        }

        this.outbox
            .append(
                "library",
                userId,
                "library.events.v1",
                Map.of("user_id", userId.toString(), "followee_id", followeeId.toString(), "action", following ? "followed_user" : "unfollowed_user")
            );
        return following;
    }

    @Transactional(
        readOnly = true
    )
    public Optional<Profile> profile(UUID callerId, UUID userId) {
        return this.users.findById(userId).map(user -> new Profile(
            user,
            this.follows.countByIdTargetId(userId),
            this.follows.countByIdUserId(userId),
            this.follows.existsById(new UserFollow.Key(callerId, userId)),
            this.follows.existsById(new UserFollow.Key(userId, callerId))
        ));
    }

    /** People whose display name contains {@code query}, the caller excluded. */
    @Transactional(
        readOnly = true
    )
    public List<UserAccount> search(UUID callerId, String query, int limit) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.codePointCount(0, trimmed.length()) < MIN_QUERY || trimmed.length() > 100) {
            throw new IllegalArgumentException("q must be between " + MIN_QUERY + " and 100 characters");
        }
        if (limit < 1 || limit > MAX_SEARCH) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_SEARCH);
        }
        String pattern = trimmed.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return this.users.searchByName(trimmed, pattern, callerId, limit);
    }

    /** Which of {@code userIds} the caller follows. */
    @Transactional(
        readOnly = true
    )
    public Set<UUID> followedAmong(UUID callerId, Collection<UUID> userIds) {
        return this.follows
            .findAllById(userIds.stream().map(id -> new UserFollow.Key(callerId, id)).toList())
            .stream()
            .map(UserFollow.Listener::getFolloweeId)
            .collect(Collectors.toSet());
    }

    /**
     * Everyone the caller follows, those with something to show first (newest first), then the
     * rest by name. Activity is null for anyone who has played nothing, is in a private session,
     * or does not share.
     */
    @Transactional(
        readOnly = true
    )
    public List<Friend> friends(UUID callerId) {
        List<UUID> followed = this.follows
            .findByIdUserIdOrderByCreatedAtDesc(callerId, Limit.of(MAX_FRIENDS))
            .stream()
            .map(UserFollow.Listener::getFolloweeId)
            .toList();
        if (followed.isEmpty()) {
            return List.of();
        }

        Map<UUID, ListenerActivity> visible = this.activity
            .visibleTo(callerId, MAX_FRIENDS)
            .stream()
            .collect(Collectors.toMap(ListenerActivity::getUserId, Function.identity()));
        return this.users
            .findAllById(followed)
            .stream()
            .map(user -> {
                ListenerActivity a = visible.get(user.getId());
                return new Friend(user.getId(), user.getDisplayName(), a == null ? null : new Activity(a.getMediaItemId(), a.isPlaying(), a.getUpdatedAt()));
            })
            .sorted(Comparator.comparing((Friend f) -> f.activity() == null)
                .thenComparing(f -> f.activity() == null ? Instant.EPOCH : f.activity().at(), Comparator.reverseOrder())
                .thenComparing(Friend::displayName, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    /**
     * From a playback event. The statements themselves skip a private session or sharing that is
     * off, so the caller needs no check of its own.
     */
    @Transactional
    public void recordActivity(UUID userId, UUID mediaItemId, String eventType) {
        if ("play_started".equals(eventType) || "play_progress".equals(eventType)) {
            this.activity.started(userId, mediaItemId);
        } else {
            this.activity.ended(userId, mediaItemId);
        }
    }

    /** Private session turned on, sharing turned off, or history cleared. */
    @Transactional
    public void clearActivity(UUID userId) {
        this.activity.clear(userId);
    }

    public record Profile(UserAccount user, long followers, long following, boolean followedByCaller, boolean followsCaller) {
    }

    public record Friend(UUID userId, String displayName, Activity activity) {
    }

    /** {@code playing} is as last reported; the gateway also ends it once the item's duration has passed. */
    public record Activity(UUID mediaItemId, boolean playing, Instant at) {
    }
}
