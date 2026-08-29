package org.adventwave.platform.library;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.platform.domain.Playlist;
import org.adventwave.platform.domain.PlaylistItem;
import org.adventwave.platform.domain.UserFollow;
import org.adventwave.platform.domain.UserLike;
import org.adventwave.platform.outbox.OutboxWriter;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LibraryService {
    private static final int MAX_RECENT = 100;
    private final PlatformRepositories.UserLikeRepository likes;
    private final PlatformRepositories.UserFollowArtistRepository artistFollows;
    private final PlatformRepositories.UserFollowPlaylistRepository playlistFollows;
    private final PlatformRepositories.PlaylistRepository playlists;
    private final PlatformRepositories.PlaylistItemRepository playlistItems;
    private final ListeningHistoryService history;
    private final OutboxWriter outbox;

    public LibraryService(
        PlatformRepositories.UserLikeRepository likes,
        PlatformRepositories.UserFollowArtistRepository artistFollows,
        PlatformRepositories.UserFollowPlaylistRepository playlistFollows,
        PlatformRepositories.PlaylistRepository playlists,
        PlatformRepositories.PlaylistItemRepository playlistItems,
        ListeningHistoryService history,
        OutboxWriter outbox
    ) {
        this.likes = likes;
        this.artistFollows = artistFollows;
        this.playlistFollows = playlistFollows;
        this.playlists = playlists;
        this.playlistItems = playlistItems;
        this.history = history;
        this.outbox = outbox;
    }

    @Transactional(
        readOnly = true
    )
    public LibrarySnapshot snapshot(UUID userId) {
        List<UUID> list = new ArrayList<>();
        List<UUID> list1 = new ArrayList<>();

        for (UserLike userlike : this.likes.findByIdUserIdOrderByCreatedAtAsc(userId)) {
            if ("saved_sermons".equals(userlike.getCollection())) {
                list1.add(userlike.getMediaItemId());
            } else {
                list.add(userlike.getMediaItemId());
            }
        }

        return new LibrarySnapshot(
            list,
            list1,
            this.userPlaylists(userId),
            this.artistFollows.findByIdUserId(userId).stream().map(UserFollow.Artist::getArtistId).toList(),
            this.playlistFollows.findByIdUserId(userId).stream().map(UserFollow.PlaylistFollow::getPlaylistId).toList(),
            this.history.recent(userId, 100)
        );
    }

    @Transactional(
        readOnly = true
    )
    public List<PlaylistSummary> userPlaylists(UUID userId) {
        return this.withItems(this.playlists.findByOwnerIdOrderByCreatedAtAsc(userId));
    }

    @Transactional(
        readOnly = true
    )
    public List<PlaylistSummary> curatedPlaylists() {
        return this.withItems(this.playlists.findByCuratedTrueAndPublicPlaylistTrueOrderByCreatedAtAsc());
    }

    @Transactional(
        readOnly = true
    )
    public Optional<PlaylistSummary> playlist(UUID playlistId) {
        return this.playlists.findById(playlistId).map(p -> this.withItems(List.of(p)).get(0));
    }

    @Transactional(
        readOnly = true
    )
    public Optional<PlaylistSummary> playlistByLegacyId(String legacyId) {
        return this.playlists.findByLegacyId(legacyId).map(p -> this.withItems(List.of(p)).get(0));
    }

    private List<PlaylistSummary> withItems(List<Playlist> found) {
        if (found.isEmpty()) {
            return List.of();
        } else {
            List<UUID> list = found.stream().map(Playlist::getId).toList();
            Map<UUID, List<UUID>> map = new LinkedHashMap<>();

            for (PlaylistItem playlistitem : this.playlistItems.findByIdPlaylistIdInOrderByPositionAsc(list)) {
                map.computeIfAbsent(playlistitem.getPlaylistId(), key -> new ArrayList<>()).add(playlistitem.getMediaItemId());
            }

            return found.stream().map(p -> PlaylistSummary.of(p, map.getOrDefault(p.getId(), List.of()))).toList();
        }
    }

    @Transactional
    public boolean toggleLike(UUID userId, UUID mediaItemId, String collection) {
        UserLike.Key userlike$key = new UserLike.Key(userId, mediaItemId, collection);
        boolean flag;
        if (this.likes.existsById(userlike$key)) {
            this.likes.deleteById(userlike$key);
            flag = false;
        } else {
            this.likes.save(new UserLike(userId, mediaItemId, collection));
            flag = true;
        }

        this.outbox
            .append(
                "library",
                userId,
                "library.events.v1",
                Map.of("user_id", userId.toString(), "media_item_id", mediaItemId.toString(), "collection", collection, "action", flag ? "liked" : "unliked")
            );
        return flag;
    }

    @Transactional
    public boolean toggleFollowArtist(UUID userId, UUID artistId) {
        UserFollow.Key userfollow$key = new UserFollow.Key(userId, artistId);
        boolean flag;
        if (this.artistFollows.existsById(userfollow$key)) {
            this.artistFollows.deleteById(userfollow$key);
            flag = false;
        } else {
            this.artistFollows.save(new UserFollow.Artist(userId, artistId));
            flag = true;
        }

        this.outbox
            .append(
                "library",
                userId,
                "library.events.v1",
                Map.of("user_id", userId.toString(), "artist_id", artistId.toString(), "action", flag ? "followed_artist" : "unfollowed_artist")
            );
        return flag;
    }

    @Transactional
    public boolean toggleFollowPlaylist(UUID userId, UUID playlistId) {
        UserFollow.Key userfollow$key = new UserFollow.Key(userId, playlistId);
        boolean flag;
        if (this.playlistFollows.existsById(userfollow$key)) {
            this.playlistFollows.deleteById(userfollow$key);
            flag = false;
        } else {
            this.playlistFollows.save(new UserFollow.PlaylistFollow(userId, playlistId));
            flag = true;
        }

        this.outbox
            .append(
                "library",
                userId,
                "library.events.v1",
                Map.of("user_id", userId.toString(), "playlist_id", playlistId.toString(), "action", flag ? "followed_playlist" : "unfollowed_playlist")
            );
        return flag;
    }

    @Transactional
    public PlaylistSummary createPlaylist(UUID userId, String title, String description, String coverUrl) {
        String s = title != null && !title.isBlank() ? title.trim() : "New playlist";
        Playlist playlist = new Playlist(userId, s, description, coverUrl);
        this.playlists.save(playlist);
        this.publishPlaylist(playlist, List.of());
        return PlaylistSummary.of(playlist, List.of());
    }

    @Transactional
    public PlaylistSummary addToPlaylist(UUID userId, UUID playlistId, List<UUID> mediaItemIds) {
        Playlist playlist = this.ownedPlaylist(userId, playlistId);
        int i = this.playlistItems.maxPosition(playlistId);

        for (UUID uuid : mediaItemIds) {
            PlaylistItem.Key playlistitem$key = new PlaylistItem.Key(playlistId, uuid);
            if (!this.playlistItems.existsById(playlistitem$key)) {
                this.playlistItems.save(new PlaylistItem(playlistId, uuid, ++i, userId));
            }
        }

        return this.touch(playlist);
    }

    @Transactional
    public PlaylistSummary removeFromPlaylist(UUID userId, UUID playlistId, UUID mediaItemId) {
        Playlist playlist = this.ownedPlaylist(userId, playlistId);
        this.playlistItems.deleteByIdPlaylistIdAndIdMediaItemId(playlistId, mediaItemId);
        return this.touch(playlist);
    }

    @Transactional
    public PlaylistSummary updatePlaylist(UUID userId, UUID playlistId, String title, String description) {
        Playlist playlist = this.ownedPlaylist(userId, playlistId);
        if (title != null && !title.isBlank()) {
            playlist.setTitle(title.trim());
        }

        if (description != null) {
            playlist.setDescription(description);
        }

        return this.touch(playlist);
    }

    @Transactional
    public void deletePlaylist(UUID userId, UUID playlistId) {
        Playlist playlist = this.ownedPlaylist(userId, playlistId);
        this.playlistItems.deleteByIdPlaylistId(playlistId);
        this.playlists.delete(playlist);
        this.outbox.append("playlist", playlistId, "catalog.playlist.v1", Map.of("playlist_id", playlistId.toString(), "deleted", true));
    }

    private PlaylistSummary touch(Playlist playlist) {
        playlist.setUpdatedAt(Instant.now());
        this.playlists.save(playlist);
        List<UUID> list = this.playlistItems
            .findByIdPlaylistIdOrderByPositionAsc(playlist.getId())
            .stream()
            .sorted(Comparator.comparingInt(PlaylistItem::getPosition))
            .map(PlaylistItem::getMediaItemId)
            .toList();
        this.publishPlaylist(playlist, list);
        return PlaylistSummary.of(playlist, list);
    }

    private void publishPlaylist(Playlist playlist, List<UUID> songIds) {
        this.outbox
            .append(
                "playlist",
                playlist.getId(),
                "catalog.playlist.v1",
                Map.of(
                    "playlist_id",
                    playlist.getId().toString(),
                    "owner_id",
                    playlist.getOwnerId() == null ? "" : playlist.getOwnerId().toString(),
                    "title",
                    playlist.getTitle(),
                    "description",
                    playlist.getDescription() == null ? "" : playlist.getDescription(),
                    "is_curated",
                    playlist.isCurated(),
                    "is_public",
                    playlist.isPublicPlaylist(),
                    "song_ids",
                    songIds.stream().map(UUID::toString).toList()
                )
            );
    }

    private Playlist ownedPlaylist(UUID userId, UUID playlistId) {
        Playlist playlist = (Playlist)this.playlists.findById(playlistId).orElseThrow(() -> new IllegalArgumentException("unknown playlist " + playlistId));
        if (!userId.equals(playlist.getOwnerId())) {
            throw new SecurityException("playlist " + playlistId + " is not owned by " + userId);
        } else {
            return playlist;
        }
    }
}
