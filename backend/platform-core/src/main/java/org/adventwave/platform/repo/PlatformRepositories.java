package org.adventwave.platform.repo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
    }

    public interface UserFollowArtistRepository extends JpaRepository<UserFollow.Artist, UserFollow.Key> {
        List<UserFollow.Artist> findByIdUserId(UUID userId);
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
