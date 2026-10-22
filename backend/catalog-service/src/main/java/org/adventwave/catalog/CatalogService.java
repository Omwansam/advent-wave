package org.adventwave.catalog;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.DiscoverCategory;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.AlbumDto;
import org.adventwave.contracts.api.ArtistDto;
import org.adventwave.contracts.api.DiscoverCategoryDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.TrackDto;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(
    readOnly = true
)
public class CatalogService {
    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final CatalogRepositories.ArtistRepository artists;
    private final CatalogRepositories.AlbumRepository albums;
    private final CatalogRepositories.DiscoverCategoryRepository categories;
    private final CatalogRepositories.DiscoverCategoryItemRepository categoryItems;
    private final CatalogProperties properties;

    public CatalogService(
        CatalogRepositories.MediaItemRepository mediaItems,
        CatalogRepositories.ArtistRepository artists,
        CatalogRepositories.AlbumRepository albums,
        CatalogRepositories.DiscoverCategoryRepository categories,
        CatalogRepositories.DiscoverCategoryItemRepository categoryItems,
        CatalogProperties properties
    ) {
        this.mediaItems = mediaItems;
        this.artists = artists;
        this.albums = albums;
        this.categories = categories;
        this.categoryItems = categoryItems;
        this.properties = properties;
    }

    public Optional<TrackDto> track(UUID id) {
        return this.mediaItems.findPublished(id).map(this::map);
    }

    public Optional<MediaItem> entity(UUID id) {
        return this.mediaItems.findPublished(id);
    }

    public List<TrackDto> tracks(List<UUID> ids) {
        if (ids != null && !ids.isEmpty()) {
            Map<UUID, TrackDto> map = new LinkedHashMap<>();

            for (MediaItem mediaitem : this.mediaItems.findAllPublished(ids)) {
                map.put(mediaitem.getId(), this.map(mediaitem));
            }

            List<TrackDto> list = new ArrayList<>(ids.size());

            for (UUID uuid : ids) {
                TrackDto trackdto = map.get(uuid);
                if (trackdto != null) {
                    list.add(trackdto);
                }
            }

            return list;
        } else {
            return List.of();
        }
    }

    public List<TrackDto> byType(MediaType mediaType, int limit) {
        return this.map(this.mediaItems.findPublishedByType(mediaType, Limit.of(limit)));
    }

    public List<TrackDto> trending(int limit) {
        return this.map(this.mediaItems.findAllPublished(Limit.of(limit)));
    }

    public List<TrackDto> trendingInRegion(String region, int limit) {
        return this.map(this.mediaItems.findPublishedByRegion(region, Limit.of(limit)));
    }

    public Optional<ArtistDto> artist(UUID id) {
        return this.artists.findById(id).map(artist -> {
            List<TrackDto> list = this.map(this.mediaItems.findPublishedByArtist(id));
            return CatalogMapper.toArtist(artist, list.stream().<String>map(TrackDto::id).toList(), list);
        });
    }

    public Optional<ArtistDto> artistByName(String name) {
        return this.artists.findByName(name).flatMap(artist -> this.artist(artist.getId()));
    }

    public Map<String, UUID> artistIdsByName(List<String> names) {
        if (names != null && !names.isEmpty()) {
            Map<String, UUID> map = new LinkedHashMap<>();
            this.artists.findByNameInIgnoreCase(names).forEach(a -> map.put(a.getName(), a.getId()));
            return map;
        } else {
            return Map.of();
        }
    }

    public Map<UUID, String> artistNamesById(List<UUID> ids) {
        if (ids != null && !ids.isEmpty()) {
            Map<UUID, String> map = new LinkedHashMap<>();
            this.artists.findAllById(ids).forEach(a -> map.put(a.getId(), a.getName()));
            return map;
        } else {
            return Map.of();
        }
    }

    public Optional<AlbumDto> album(UUID id) {
        return this.albums.findWithArtist(id).map(album -> {
            List<TrackDto> list = this.map(this.mediaItems.findPublishedByAlbum(id));
            return CatalogMapper.toAlbum(album, list.stream().<String>map(TrackDto::id).toList(), list);
        });
    }

    public List<DiscoverCategoryDto> discoverCategories() {
        return this.categories
            .findAllByOrderBySortOrderAsc()
            .stream()
            .map(c -> new DiscoverCategoryDto(c.getId(), c.getLabel(), c.getGradient(), c.getCoverUrl(), c.getSortOrder()))
            .toList();
    }

    public CatalogTotals publishedTotals() {
        Map<MediaType, Long> items = new EnumMap<>(MediaType.class);
        long durationMs = 0L;

        for (Object[] row : this.mediaItems.publishedTotalsByType()) {
            items.put((MediaType)row[0], ((Number)row[1]).longValue());
            durationMs += ((Number)row[2]).longValue();
        }

        return new CatalogTotals(
            items.getOrDefault(MediaType.SONG, 0L),
            items.getOrDefault(MediaType.SERMON, 0L),
            items.getOrDefault(MediaType.PODCAST, 0L),
            durationMs,
            this.mediaItems.countPublishedArtists(),
            this.mediaItems.countPublishedChurches()
        );
    }

    public List<TrackDto> discoverCategoryTracks(String categoryId) {
        List<UUID> list = this.categoryItems.findByIdCategoryIdOrderByPositionAsc(categoryId).stream().map(DiscoverCategory.Item::getMediaItemId).toList();
        return this.tracks(list);
    }

    private TrackDto map(MediaItem item) {
        return CatalogMapper.toTrack(item, this.properties.getApiBaseUrl());
    }

    private List<TrackDto> map(List<MediaItem> items) {
        return CatalogMapper.toTracks(items, this.properties.getApiBaseUrl());
    }
}
