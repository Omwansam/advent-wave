package org.adventwave.catalog.repo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.Church;
import org.adventwave.catalog.domain.License;
import org.adventwave.catalog.domain.DiscoverCategory;
import org.adventwave.catalog.domain.MediaAsset;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.contracts.api.MediaType;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
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

    public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
        List<MediaAsset> findByMediaItemIdOrderByBitrateKbpsAsc(UUID mediaItemId);

        void deleteByMediaItemId(UUID mediaItemId);
    }

    public interface ChurchRepository extends JpaRepository<Church, UUID> {
        List<Church> findAllByOrderByNameAsc();
    }

    public interface LicenseRepository extends JpaRepository<License, UUID> {
        List<License> findByChurchIdOrderByCreatedAtDesc(UUID churchId);
    }

    public interface MediaItemRepository extends JpaRepository<MediaItem, UUID> {
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
    }
}
