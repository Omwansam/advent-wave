package org.adventwave.catalog.search;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.adventwave.catalog.CatalogMapper;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.catalog.MediaTextService;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.domain.MediaLyrics;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.AlbumDto;
import org.adventwave.contracts.api.ArtistDto;
import org.adventwave.contracts.api.LyricsMatchDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.SearchResultsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.contracts.api.SearchResultsDto.TopResult;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(
    readOnly = true
)
public class SearchService {
    private static final int SONG_LIMIT = 48;
    private static final int SERMON_LIMIT = 24;
    private static final int PODCAST_LIMIT = 16;
    private static final int ARTIST_LIMIT = 20;
    private static final int ALBUM_LIMIT = 20;
    private static final int PLAYLIST_LIMIT = 20;
    private static final int CANDIDATE_LIMIT = 500;
    /** RFC 0004. Shorter queries match the words of nearly every hymn. */
    private static final int LYRICS_MIN_QUERY = 3;
    private static final int LYRICS_LIMIT = 10;
    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final CatalogRepositories.ArtistRepository artists;
    private final CatalogRepositories.AlbumRepository albums;
    private final CatalogRepositories.MediaLyricsRepository lyrics;
    private final CatalogProperties properties;

    public SearchService(
        CatalogRepositories.MediaItemRepository mediaItems,
        CatalogRepositories.ArtistRepository artists,
        CatalogRepositories.AlbumRepository albums,
        CatalogRepositories.MediaLyricsRepository lyrics,
        CatalogProperties properties
    ) {
        this.mediaItems = mediaItems;
        this.artists = artists;
        this.albums = albums;
        this.lyrics = lyrics;
        this.properties = properties;
    }

    public SearchResultsDto search(String rawQuery, List<PlaylistDto> playlists) {
        String s = rawQuery == null ? "" : rawQuery.trim();
        if (s.isEmpty()) {
            return SearchResultsDto.empty();
        } else {
            boolean flag = SearchRanking.isKenyaQuery(s);
            List<MediaItem> list = this.mediaItems.searchCandidates(s, Limit.of(500));
            List<SearchService.Scored<TrackDto>> list1 = new ArrayList<>();
            List<SearchService.Scored<TrackDto>> list2 = new ArrayList<>();
            List<SearchService.Scored<TrackDto>> list3 = new ArrayList<>();

            for (MediaItem mediaitem : list) {
                int i = this.trackScore(mediaitem, s, flag);
                if (i >= 0) {
                    SearchService.Scored<TrackDto> scored = new SearchService.Scored<>(CatalogMapper.toTrack(mediaitem, this.properties.getApiBaseUrl()), i);
                    switch (mediaitem.getMediaType()) {
                        case SONG:
                            list1.add(scored);
                            break;
                        case SERMON:
                            list2.add(scored);
                            break;
                        case PODCAST:
                            list3.add(scored);
                    }
                }
            }

            Map<UUID, SearchService.Scored<Artist>> map = new LinkedHashMap<>();

            for (Artist artist : this.artists.searchCandidates(s, Limit.of(500))) {
                int k = SearchRanking.matchScore(artist.getName(), s);
                if (k >= 0) {
                    map.put(artist.getId(), new SearchService.Scored<>(artist, k));
                }
            }

            for (MediaItem mediaitem1 : list) {
                Artist artist1 = mediaitem1.getArtist();
                int j = SearchRanking.matchScore(artist1.getName(), s);
                if (j >= 0) {
                    SearchService.Scored<Artist> scored1 = map.get(artist1.getId());
                    if (scored1 == null || j > scored1.score()) {
                        map.put(artist1.getId(), new SearchService.Scored<>(artist1, j));
                    }
                }
            }

            List<SearchService.Scored<AlbumDto>> list4 = new ArrayList<>();

            for (Album album : this.albums.searchCandidates(s, Limit.of(500))) {
                int l = Math.max(SearchRanking.matchScore(album.getTitle(), s), SearchRanking.matchScore(album.getArtist().getName(), s));
                if (l >= 0) {
                    list4.add(new SearchService.Scored<>(CatalogMapper.toAlbum(album, List.of(), null).withoutTracks(), l));
                }
            }

            List<SearchService.Scored<PlaylistDto>> list5 = new ArrayList<>();

            for (PlaylistDto playlistdto : playlists == null ? List.<PlaylistDto>of() : playlists) {
                int i1 = Math.max(
                    SearchRanking.matchScore(playlistdto.title(), s),
                    SearchRanking.matchScore(playlistdto.description() == null ? "" : playlistdto.description(), s)
                );
                if (i1 >= 0) {
                    list5.add(new SearchService.Scored<>(playlistdto.unresolved(), i1));
                }
            }

            List<SearchService.Scored<ArtistDto>> list6 = map.values()
                .stream()
                .map(scored -> new SearchService.Scored<>(CatalogMapper.toArtist(scored.value(), List.of(), null).withoutTracks(), scored.score()))
                .toList();
            TopResult topresult = this.topResult(list1, list2, list3, list6, list4, list5);
            List<TrackDto> songs = this.take(list1, 48);
            return new SearchResultsDto(
                songs, this.take(list2, 24), this.take(list3, 16), this.take(list6, 20), this.take(list4, 20), this.take(list5, 20), topresult,
                this.lyricsMatches(s, songs)
            );
        }
    }

    /**
     * Songs found by a line of their words (RFC 0004) — "when peace like a river" finds It Is Well.
     * Kept apart from the ranked lists, whose scores are ported from searchRank.js and stay so;
     * a song those lists already hold is not repeated here. Null when there is nothing to add.
     */
    private List<LyricsMatchDto> lyricsMatches(String query, List<TrackDto> alreadyFound) {
        if (query.length() < LYRICS_MIN_QUERY) {
            return null;
        }
        Set<String> found = new HashSet<>(alreadyFound.stream().map(TrackDto::id).toList());
        List<UUID> ids = this.lyrics.searchPublishedSongs(query, LYRICS_LIMIT + found.size()).stream()
            .filter(id -> !found.contains(id.toString()))
            .limit(LYRICS_LIMIT)
            .toList();
        if (ids.isEmpty()) {
            return null;
        }
        Map<UUID, MediaItem> items = this.mediaItems.findAllPublished(ids).stream()
            .collect(Collectors.toMap(MediaItem::getId, Function.identity()));
        Map<UUID, MediaLyrics> words = this.lyrics.findAllById(ids).stream()
            .collect(Collectors.toMap(MediaLyrics::getMediaItemId, Function.identity()));
        List<LyricsMatchDto> matches = new ArrayList<>(ids.size());
        for (UUID id : ids) {
            MediaItem item = items.get(id);
            MediaLyrics text = words.get(id);
            if (item != null && text != null) {
                matches.add(new LyricsMatchDto(CatalogMapper.toTrack(item, this.properties.getApiBaseUrl()), MediaTextService.firstMatchingLine(text, query)));
            }
        }
        return matches.isEmpty() ? null : matches;
    }

    private int trackScore(MediaItem item, String query, boolean kenyaBoost) {
        int i = SearchRanking.bestTrackScore(item.getTitle(), item.getArtist().getName(), item.getAlbum() == null ? null : item.getAlbum().getTitle(), query);
        if (i < 0) {
            return i;
        } else {
            if (kenyaBoost && item.getMediaType() == MediaType.SONG && "kenya".equals(item.getRegion())) {
                i += 2500;
            }

            return i;
        }
    }

    private TopResult topResult(
        List<SearchService.Scored<TrackDto>> songs,
        List<SearchService.Scored<TrackDto>> sermons,
        List<SearchService.Scored<TrackDto>> podcasts,
        List<SearchService.Scored<ArtistDto>> artistHits,
        List<SearchService.Scored<AlbumDto>> albumHits,
        List<SearchService.Scored<PlaylistDto>> playlistHits
    ) {
        TopResult topresult = null;
        topresult = this.better(topresult, this.typed("song", songs));
        topresult = this.better(topresult, this.typed("sermon", sermons));
        topresult = this.better(topresult, this.typed("podcast", podcasts));
        topresult = this.better(topresult, this.typed("playlist", playlistHits));
        topresult = this.better(topresult, this.typed("album", albumHits));
        return this.better(topresult, this.typed("artist", artistHits));
    }

    private <T> TopResult typed(String type, List<SearchService.Scored<T>> scored) {
        return scored.stream().max(Comparator.comparingInt(SearchService.Scored::score)).map(s -> new TopResult(type, s.value(), s.score())).orElse(null);
    }

    private TopResult better(TopResult current, TopResult candidate) {
        if (candidate == null) {
            return current;
        } else {
            return current != null && candidate.score() <= current.score() ? current : candidate;
        }
    }

    private <T> List<T> take(List<SearchService.Scored<T>> scored, int limit) {
        return scored.stream().sorted(Comparator.<SearchService.Scored<T>>comparingInt(SearchService.Scored::score).reversed()).limit(limit).map(SearchService.Scored::value).toList();
    }

    private record Scored<T>(T value, int score) {
    }
}
