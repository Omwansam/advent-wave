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
import org.adventwave.catalog.domain.Conference;
import org.adventwave.catalog.domain.DiscoverCategory;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.AlbumDto;
import org.adventwave.contracts.api.ArtistDto;
import org.adventwave.contracts.api.ArtistKind;
import org.adventwave.contracts.api.ArtistSummaryDto;
import org.adventwave.contracts.api.ArtistsDto;
import org.adventwave.contracts.api.ConferenceDto;
import org.adventwave.contracts.api.ConferencesDto;
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
    private final CatalogRepositories.ConferenceRepository conferences;
    private final ArtistDirectory directory;
    private final CatalogProperties properties;
    /** "More from {church}" and "More like this" on a profile page. */
    private static final int RELATED = 12;

    public CatalogService(
        CatalogRepositories.MediaItemRepository mediaItems,
        CatalogRepositories.ArtistRepository artists,
        CatalogRepositories.AlbumRepository albums,
        CatalogRepositories.DiscoverCategoryRepository categories,
        CatalogRepositories.DiscoverCategoryItemRepository categoryItems,
        CatalogRepositories.ConferenceRepository conferences,
        ArtistDirectory directory,
        CatalogProperties properties
    ) {
        this.mediaItems = mediaItems;
        this.artists = artists;
        this.albums = albums;
        this.categories = categories;
        this.categoryItems = categoryItems;
        this.conferences = conferences;
        this.directory = directory;
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

    /**
     * A profile page (RFC 0009). A church plays its own recordings and its members' and lists the
     * members; a member names its home church and its sister profiles there; anything else gets
     * profiles like it.
     */
    public Optional<ArtistDto> artist(UUID id) {
        return this.artists.findById(id).map(this::profile);
    }

    private ArtistDto profile(Artist artist) {
        UUID id = artist.getId();
        Artist home = artist.getHomeChurchId() == null ? null : this.artists.findById(artist.getHomeChurchId()).orElse(null);
        boolean church = artist.getKind() == ArtistKind.CHURCH;
        List<UUID> memberIds = church ? this.directory.memberIds(id) : List.of();
        List<TrackDto> tracks = this.map(
            memberIds.isEmpty() ? this.mediaItems.findPublishedByArtist(id) : this.mediaItems.findPublishedByArtists(ArtistDirectory.with(memberIds, id))
        );
        String conferenceId = artist.getConferenceId() != null ? artist.getConferenceId() : home == null ? null : home.getConferenceId();
        List<UUID> related = home != null
            ? ArtistDirectory.without(this.directory.members(home.getId()), id)
            : this.directory.similar(artist, conferenceId, RELATED);
        return new ArtistDto(
            id.toString(),
            artist.getName(),
            artist.getSlug(),
            Covers.artist(artist, this.properties.getCoverBaseUrl()),
            artist.isVerified(),
            tracks.stream().map(TrackDto::id).toList(),
            tracks,
            artist.getKind(),
            artist.getEnsemble(),
            artist.getBio(),
            artist.getLocation(),
            this.directory.followers(id),
            this.conference(conferenceId),
            home == null ? null : CatalogMapper.toSummary(home, null, this.properties),
            church ? this.summaries(this.directory.members(id)) : null,
            this.summaries(related.stream().limit(RELATED).toList())
        );
    }

    /** {@code GET /v1/artists}: profiles with something to hear, the most listened to first. */
    public ArtistsDto artists(ArtistDirectory.Filter filter, int limit) {
        return new ArtistsDto(this.summaries(this.directory.list(filter, limit)));
    }

    /** {@code GET /v1/conferences}: each union with its conferences and fields, and how many churches each has. */
    public ConferencesDto conferences() {
        List<Conference> all = this.conferences.findAllByOrderBySortOrderAsc();
        Map<String, Integer> churches = this.directory.churchesByConference();
        List<ConferenceDto> unions = all.stream()
            .filter(c -> "union".equals(c.getKind()))
            .map(u -> conferenceDto(u, null, churches.getOrDefault(u.getId(), 0), all.stream()
                .filter(c -> u.getId().equals(c.getParentId()))
                .map(c -> conferenceDto(c, null, churches.getOrDefault(c.getId(), 0), null))
                .toList()))
            .toList();
        return new ConferencesDto(unions);
    }

    private ConferenceDto conference(String id) {
        if (id == null) {
            return null;
        }

        return this.conferences.findById(id).map(c -> {
            Conference parent = c.getParentId() == null ? null : this.conferences.findById(c.getParentId()).orElse(null);
            ConferenceDto union = parent != null && "union".equals(parent.getKind()) ? conferenceDto(parent, null, null, null) : null;
            return conferenceDto(c, union, null, null);
        }).orElse(null);
    }

    private static ConferenceDto conferenceDto(Conference c, ConferenceDto union, Integer churches, List<ConferenceDto> children) {
        return new ConferenceDto(c.getId(), c.getName(), c.getShortName(), c.getKind(), c.getHeadquarters(), c.getWebsite(), union, churches, children);
    }

    /** Cards for these profiles, in this order, each with its home church's name. */
    private List<ArtistSummaryDto> summaries(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }

        Map<UUID, Artist> byId = new LinkedHashMap<>();
        this.artists.findAllById(ids).forEach(a -> byId.put(a.getId(), a));
        List<UUID> homeIds = byId.values().stream().map(Artist::getHomeChurchId).filter(h -> h != null && !byId.containsKey(h)).distinct().toList();
        Map<UUID, Artist> homes = new LinkedHashMap<>(byId);
        this.artists.findAllById(homeIds).forEach(a -> homes.put(a.getId(), a));
        return ids.stream()
            .map(byId::get)
            .filter(a -> a != null)
            .map(a -> CatalogMapper.toSummary(a, a.getHomeChurchId() == null ? null : homes.get(a.getHomeChurchId()), this.properties))
            .toList();
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
            return CatalogMapper.toAlbum(album, list.stream().<String>map(TrackDto::id).toList(), list, this.properties);
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
        return CatalogMapper.toTrack(item, this.properties);
    }

    private List<TrackDto> map(List<MediaItem> items) {
        return CatalogMapper.toTracks(items, this.properties);
    }
}
