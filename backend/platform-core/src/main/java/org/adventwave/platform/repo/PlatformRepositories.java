package org.adventwave.platform.repo;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.platform.domain.ListenerActivity;
import org.adventwave.platform.domain.ListenerCredential;
import org.adventwave.platform.domain.ListenerToken;
import org.adventwave.platform.domain.ListeningHistoryEntry;
import org.adventwave.platform.domain.ListeningProgress;
import org.adventwave.platform.domain.OutboxEvent;
import org.adventwave.platform.domain.PlayerState;
import org.adventwave.platform.domain.Playlist;
import org.adventwave.platform.domain.PlaylistItem;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.domain.UserFollow;
import org.adventwave.platform.domain.UserLike;
import org.adventwave.platform.domain.UserSettings;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public final class PlatformRepositories {
    private PlatformRepositories() {
    }

    public interface ListeningHistoryRepository extends JpaRepository<ListeningHistoryEntry, Long> {
        List<ListeningHistoryEntry> findByUserIdOrderByPlayedAtDesc(UUID userId);

        Optional<ListeningHistoryEntry> findByUserIdAndMediaItemId(UUID userId, UUID mediaItemId);

        void deleteByUserId(UUID userId);

        @Modifying
        @Query(
            value = "DELETE FROM listening_history\nWHERE user_id = :userId\n  AND id NOT IN (\n      SELECT id FROM listening_history\n      WHERE user_id = :userId\n      ORDER BY played_at DESC\n      LIMIT :keep\n  )\n",
            nativeQuery = true
        )
        void trimToNewest(@Param("userId") UUID userId, @Param("keep") int keep);
    }

    public interface ListenerActivityRepository extends JpaRepository<ListenerActivity, UUID> {
        /**
         * play_started: this listener is now playing this item (RFC 0007). One statement, so two
         * events racing for a listener with no row yet cannot both try to insert it. Writes
         * nothing in a private session or with sharing off.
         */
        @Modifying
        @Query(
            value = "INSERT INTO listener_activity (user_id, media_item_id, playing, updated_at)\nSELECT s.user_id, :mediaItemId, TRUE, now() FROM user_settings s\nWHERE s.user_id = :userId AND s.share_activity AND NOT s.private_session\nON CONFLICT (user_id) DO UPDATE\n  SET media_item_id = EXCLUDED.media_item_id,\n      playing       = TRUE,\n      updated_at    = EXCLUDED.updated_at\n",
            nativeQuery = true
        )
        int started(@Param("userId") UUID userId, @Param("mediaItemId") UUID mediaItemId);

        /**
         * play_completed or skipped. Ends the row only if it is still this item: the client sends
         * the old song's end and the next song's start together, and they can arrive either way
         * round.
         */
        @Modifying
        @Query(
            value = "INSERT INTO listener_activity (user_id, media_item_id, playing, updated_at)\nSELECT s.user_id, :mediaItemId, FALSE, now() FROM user_settings s\nWHERE s.user_id = :userId AND s.share_activity AND NOT s.private_session\nON CONFLICT (user_id) DO UPDATE\n  SET playing    = FALSE,\n      updated_at = EXCLUDED.updated_at\n  WHERE listener_activity.media_item_id = EXCLUDED.media_item_id\n",
            nativeQuery = true
        )
        int ended(@Param("userId") UUID userId, @Param("mediaItemId") UUID mediaItemId);

        /** What one listener may see: the people they follow who share, outside a private session. */
        @Query(
            value = "SELECT a.* FROM listener_activity a\nJOIN user_follows_user f ON f.followee_id = a.user_id\nJOIN user_settings s ON s.user_id = a.user_id\nWHERE f.user_id = :followerId AND s.share_activity AND NOT s.private_session\nORDER BY a.updated_at DESC\nLIMIT :limit\n",
            nativeQuery = true
        )
        List<ListenerActivity> visibleTo(@Param("followerId") UUID followerId, @Param("limit") int limit);

        @Modifying
        @Query("delete from ListenerActivity a where a.userId = :userId")
        int clear(@Param("userId") UUID userId);
    }

    public interface ListenerCredentialRepository extends JpaRepository<ListenerCredential, UUID> {
    }

    public interface ListenerTokenRepository extends JpaRepository<ListenerToken, String> {
        /** Unused links of one purpose created since a moment, newest first: the resend throttle. */
        List<ListenerToken> findByUserIdAndPurposeAndCreatedAtAfterOrderByCreatedAtDesc(UUID userId, String purpose, Instant since);

        /** Spends every outstanding link of one purpose — a used reset link retires its siblings. */
        @Modifying
        @Query("update ListenerToken t set t.usedAt = :now where t.userId = :userId and t.purpose = :purpose and t.usedAt is null")
        int spendAll(@Param("userId") UUID userId, @Param("purpose") String purpose, @Param("now") Instant now);
    }

    public interface ListeningProgressRepository extends JpaRepository<ListeningProgress, ListeningProgress.Key> {
        List<ListeningProgress> findByIdUserIdOrderByUpdatedAtDesc(UUID userId, Limit limit);

        // One statement, so two devices writing the same new item at once both land rather
        // than one losing a primary-key race. The server's clock stamps it: last write wins.
        @Modifying(
            clearAutomatically = true
        )
        @Query(
            value = "INSERT INTO listening_progress (user_id, media_item_id, position_ms, completed, updated_at)\nVALUES (:userId, :mediaItemId, :positionMs, :completed, now())\nON CONFLICT (user_id, media_item_id) DO UPDATE\n  SET position_ms = EXCLUDED.position_ms,\n      completed   = EXCLUDED.completed,\n      updated_at  = EXCLUDED.updated_at\n",
            nativeQuery = true
        )
        void upsert(
            @Param("userId") UUID userId,
            @Param("mediaItemId") UUID mediaItemId,
            @Param("positionMs") int positionMs,
            @Param("completed") boolean completed
        );

        @Modifying
        @Query(
            value = "DELETE FROM listening_progress\nWHERE user_id = :userId\n  AND media_item_id NOT IN (\n      SELECT media_item_id FROM listening_progress\n      WHERE user_id = :userId\n      ORDER BY updated_at DESC\n      LIMIT :keep\n  )\n",
            nativeQuery = true
        )
        void trimToNewest(@Param("userId") UUID userId, @Param("keep") int keep);
    }

    public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {
        List<OutboxEvent> findByAggregateTypeAndAggregateIdOrderByIdAsc(String aggregateType, String aggregateId);

        long countByPublishedAtIsNull();
    }

    public interface PlayerStateRepository extends JpaRepository<PlayerState, UUID> {
    }

    public interface PlaylistItemRepository extends JpaRepository<PlaylistItem, PlaylistItem.Key> {
        List<PlaylistItem> findByIdPlaylistIdOrderByPositionAsc(UUID playlistId);

        List<PlaylistItem> findByIdPlaylistIdInOrderByPositionAsc(List<UUID> playlistIds);

        @Query("select coalesce(max(i.position), -1) from PlaylistItem i where i.id.playlistId = :playlistId")
        int maxPosition(@Param("playlistId") UUID playlistId);

        void deleteByIdPlaylistIdAndIdMediaItemId(UUID playlistId, UUID mediaItemId);

        void deleteByIdPlaylistId(UUID playlistId);
    }

    public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {
        List<Playlist> findByOwnerIdOrderByCreatedAtAsc(UUID ownerId);

        List<Playlist> findByCuratedTrueAndPublicPlaylistTrueOrderByCreatedAtAsc();

        Optional<Playlist> findByLegacyId(String legacyId);
    }

    public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
        Optional<UserAccount> findByExternalAuthId(String externalAuthId);

        Optional<UserAccount> findByEmail(String email);

        /**
         * Finding a friend by name (RFC 0007): exact matches, then names that start with the
         * query, then the rest. {@code pattern} is the query with LIKE's wildcards escaped.
         */
        @Query(
            value = "SELECT * FROM users\nWHERE display_name ILIKE ('%' || :pattern || '%') AND id <> :exclude\nORDER BY CASE WHEN lower(display_name) = lower(:query) THEN 0\n              WHEN display_name ILIKE (:pattern || '%') THEN 1\n              ELSE 2 END,\n         display_name, id\nLIMIT :limit\n",
            nativeQuery = true
        )
        List<UserAccount> searchByName(
            @Param("query") String query, @Param("pattern") String pattern, @Param("exclude") UUID exclude, @Param("limit") int limit
        );
    }

    public interface UserFollowArtistRepository extends JpaRepository<UserFollow.Artist, UserFollow.Key> {
        List<UserFollow.Artist> findByIdUserId(UUID userId);
    }

    public interface UserFollowUserRepository extends JpaRepository<UserFollow.Listener, UserFollow.Key> {
        List<UserFollow.Listener> findByIdUserIdOrderByCreatedAtDesc(UUID userId, Limit limit);

        long countByIdUserId(UUID userId);

        long countByIdTargetId(UUID followeeId);
    }

    public interface UserFollowPlaylistRepository extends JpaRepository<UserFollow.PlaylistFollow, UserFollow.Key> {
        List<UserFollow.PlaylistFollow> findByIdUserId(UUID userId);
    }

    public interface UserLikeRepository extends JpaRepository<UserLike, UserLike.Key> {
        List<UserLike> findByIdUserIdOrderByCreatedAtAsc(UUID userId);

        List<UserLike> findByIdUserIdAndIdCollectionOrderByCreatedAtAsc(UUID userId, String collection);
    }

    public interface UserSettingsRepository extends JpaRepository<UserSettings, UUID> {
    }
}
