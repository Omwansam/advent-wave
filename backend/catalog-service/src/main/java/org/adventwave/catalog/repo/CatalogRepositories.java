package org.adventwave.catalog.repo;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.Church;
import org.adventwave.catalog.domain.License;
import org.adventwave.catalog.domain.DiscoverCategory;
import org.adventwave.catalog.domain.MediaAsset;
import org.adventwave.catalog.domain.MediaChapter;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.domain.MediaLyrics;
import org.adventwave.contracts.api.MediaType;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public final class CatalogRepositories {
    private CatalogRepositories() {
    }

    public interface AlbumRepository extends JpaRepository<Album, UUID> {
        @Query("select al from Album al join fetch al.artist where al.id = :id")
        Optional<Album> findWithArtist(@Param("id") UUID id);

        @Query("select al from Album al join fetch al.artist a\nwhere lower(al.title) like lower(concat('%', :q, '%'))\n   or lower(a.name)   like lower(concat('%', :q, '%'))\n")
        List<Album> searchCandidates(@Param("q") String query, Limit limit);

        /** The admin portal's album list for one artist: newest release first, undated last. */
        @Query("select al from Album al join fetch al.artist where al.artist.id = :artistId order by al.releaseDate desc nulls last, al.title asc")
        List<Album> findByArtistForAdmin(@Param("artistId") UUID artistId);

        @Query("select al from Album al join fetch al.artist a order by a.name asc, al.title asc")
        List<Album> findAllForAdmin(Limit limit);
    }

    public interface ArtistRepository extends JpaRepository<Artist, UUID> {
        Optional<Artist> findByName(String name);

        Optional<Artist> findBySlug(String slug);

        List<Artist> findByNameInIgnoreCase(List<String> names);

        @Query("select a from Artist a where lower(a.name) like lower(concat('%', :q, '%'))")
        List<Artist> searchCandidates(@Param("q") String query, Limit limit);
    }

    public interface DiscoverCategoryItemRepository extends JpaRepository<DiscoverCategory.Item, DiscoverCategory.Item.Key> {
        List<DiscoverCategory.Item> findByIdCategoryIdOrderByPositionAsc(String categoryId);
    }

    public interface DiscoverCategoryRepository extends JpaRepository<DiscoverCategory, String> {
        List<DiscoverCategory> findAllByOrderBySortOrderAsc();
    }

    public interface MediaChapterRepository extends JpaRepository<MediaChapter, MediaChapter.Key> {
        List<MediaChapter> findByIdMediaItemIdOrderByIdPositionAsc(UUID mediaItemId);

        @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
        )
        @Query("delete from MediaChapter c where c.id.mediaItemId = :mediaItemId")
        void deleteForItem(@Param("mediaItemId") UUID mediaItemId);
    }

    public interface MediaLyricsRepository extends JpaRepository<MediaLyrics, UUID> {
        /**
         * Published songs whose words contain {@code q}, case-insensitively, most popular first.
         * The trigram index on plain_text serves the ILIKE (RFC 0004).
         */
        @Query(
            value = "SELECT l.media_item_id FROM media_lyrics l\nJOIN media_items m ON m.id = l.media_item_id\nWHERE m.status = 'published' AND m.media_type = 'song'\n  AND l.plain_text ILIKE ('%' || :q || '%')\nORDER BY m.popularity DESC, m.title ASC\nLIMIT :limit\n",
            nativeQuery = true
        )
        List<UUID> searchPublishedSongs(@Param("q") String q, @Param("limit") int limit);
    }

    public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
        List<MediaAsset> findByMediaItemIdOrderByBitrateKbpsAsc(UUID mediaItemId);

        void deleteByMediaItemId(UUID mediaItemId);
    }

    public interface ChurchRepository extends JpaRepository<Church, UUID> {
        List<Church> findAllByOrderByNameAsc();
    }

    public interface LicenseRepository extends JpaRepository<License, UUID> {
        List<License> findByChurchIdOrderByCreatedAtDesc(UUID churchId);

        List<License> findAllByOrderByCreatedAtDesc();

        List<License> findByConsentStatusOrderByCreatedAtDesc(String consentStatus);

        /** Granted licences whose expiry has passed: they no longer permit anything. */
        List<License> findByConsentStatusAndExpiresAtLessThanEqual(String consentStatus, Instant at);
    }

    public interface MediaItemRepository extends JpaRepository<MediaItem, UUID> {
        List<MediaItem> findByLicenseIdAndStatus(UUID licenseId, String status);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.id = :id and m.status = 'published'\n")
        Optional<MediaItem> findPublished(@Param("id") UUID id);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.id in :ids and m.status = 'published'\n")
        List<MediaItem> findAllPublished(@Param("ids") List<UUID> ids);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.status = 'published' and m.mediaType = :mediaType\norder by m.popularity desc, m.title asc\n")
        List<MediaItem> findPublishedByType(@Param("mediaType") MediaType mediaType, Limit limit);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.status = 'published'\norder by m.popularity desc, m.title asc\n")
        List<MediaItem> findAllPublished(Limit limit);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.status = 'published' and m.artist.id = :artistId\norder by m.popularity desc, m.title asc\n")
        List<MediaItem> findPublishedByArtist(@Param("artistId") UUID artistId);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.status = 'published' and m.album.id = :albumId\norder by m.title asc\n")
        List<MediaItem> findPublishedByAlbum(@Param("albumId") UUID albumId);

        @Query("select m from MediaItem m\n  join fetch m.artist\n  left join fetch m.album\nwhere m.status = 'published' and m.region = :region\norder by m.popularity desc\n")
        List<MediaItem> findPublishedByRegion(@Param("region") String region, Limit limit);

        Optional<MediaItem> findByLegacyId(String legacyId);

        @Query("select m from MediaItem m join fetch m.artist left join fetch m.album where m.status = :status order by m.updatedAt desc")
        List<MediaItem> findByStatus(@Param("status") String status, Limit limit);

        @Query("select m from MediaItem m join fetch m.artist left join fetch m.album order by m.updatedAt desc")
        List<MediaItem> findAllForAdmin(Limit limit);

        @Query("select m from MediaItem m join fetch m.artist left join fetch m.album where m.id = :id")
        Optional<MediaItem> findAnyStatus(@Param("id") UUID id);

        @Query("select m from MediaItem m\n  join fetch m.artist a\n  left join fetch m.album al\nwhere m.status = 'published'\n  and (lower(m.title) like lower(concat('%', :q, '%'))\n    or lower(a.name)   like lower(concat('%', :q, '%'))\n    or lower(al.title) like lower(concat('%', :q, '%')))\n")
        List<MediaItem> searchCandidates(@Param("q") String query, Limit limit);

        /** One row per media type with anything published: {@code [MediaType, count, total durationMs]}. */
        @Query("select m.mediaType, count(m), coalesce(sum(m.durationMs), 0) from MediaItem m where m.status = 'published' group by m.mediaType")
        List<Object[]> publishedTotalsByType();

        @Query("select count(distinct m.artist.id) from MediaItem m where m.status = 'published'")
        long countPublishedArtists();

        /** Churches whose licence covers at least one published item. */
        @Query("select count(distinct l.churchId) from MediaItem m, License l where m.licenseId = l.id and m.status = 'published'")
        long countPublishedChurches();
    }
}
