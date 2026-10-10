package org.adventwave.gateway.admin;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.adventwave.catalog.domain.Album;
import org.adventwave.catalog.domain.Artist;
import org.adventwave.catalog.domain.Church;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.catalog.domain.License;
import org.adventwave.catalog.domain.MediaAsset;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.media.BitrateLadder;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.admin.AdminAlbumDto;
import org.adventwave.contracts.api.admin.AdminArtistDto;
import org.adventwave.contracts.api.admin.AdminMediaItemDto;
import org.adventwave.contracts.api.admin.ChurchDto;
import org.adventwave.contracts.api.admin.LicenseDto;
import org.adventwave.contracts.events.Topics;
import org.adventwave.platform.outbox.OutboxWriter;
import org.adventwave.gateway.upload.MasterKeys;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * The ingest path: how contributors, licences, artists, albums and media items enter the
 * catalogue (plan §4 weeks 1–2, workstream A: "CRUD for user/playlist/artist/church"; §3,
 * workstream H's content path; §11.6, the request that starts a transcode).
 *
 * <p>Every write that changes catalogue state appends its outbox row in the same transaction
 * (the workstream A invariant). This is the first producer of {@code catalog.media.v1},
 * {@code catalog.artist.v1} and {@code audio.transcode.v1}.
 *
 * <p>What it deliberately does not do: publish. Publication is the transcode consumer's job
 * ({@code TranscodeCompletedHandler}) and, for re-publishing, {@link #publish}; both go through
 * {@link MediaPublicationService} so the licence trigger is the only gate.
 */
@Service
@Transactional
public class CatalogAdminService {
    private static final int LIST_LIMIT_MAX = 500;
    private static final List<String> LICENSE_STATUSES = List.of("pending", "granted", "revoked", "expired");

    private final CatalogRepositories.ChurchRepository churches;
    private final CatalogRepositories.LicenseRepository licenses;
    private final CatalogRepositories.ArtistRepository artists;
    private final CatalogRepositories.AlbumRepository albums;
    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final CatalogRepositories.MediaAssetRepository assets;
    private final MediaPublicationService publication;
    private final OutboxWriter outbox;
    private final CatalogProperties catalog;
    @PersistenceContext
    private EntityManager entityManager;

    public CatalogAdminService(
        CatalogRepositories.ChurchRepository churches,
        CatalogRepositories.LicenseRepository licenses,
        CatalogRepositories.ArtistRepository artists,
        CatalogRepositories.AlbumRepository albums,
        CatalogRepositories.MediaItemRepository mediaItems,
        CatalogRepositories.MediaAssetRepository assets,
        MediaPublicationService publication,
        OutboxWriter outbox,
        CatalogProperties catalog
    ) {
        this.churches = churches;
        this.licenses = licenses;
        this.artists = artists;
        this.albums = albums;
        this.mediaItems = mediaItems;
        this.assets = assets;
        this.publication = publication;
        this.outbox = outbox;
        this.catalog = catalog;
    }

    // ----------------------------------------------------------------- churches

    public ChurchDto createChurch(ChurchDto.Request r) {
        return AdminMapper.church(this.churches.save(new Church(r.name().trim(), r.country(), r.region(), r.contactEmail())));
    }

    @Transactional(readOnly = true)
    public List<ChurchDto> listChurches() {
        return this.churches.findAllByOrderByNameAsc().stream().map(AdminMapper::church).toList();
    }

    @Transactional(readOnly = true)
    public ChurchDto church(UUID id) {
        return AdminMapper.church(this.requireChurch(id));
    }

    public ChurchDto updateChurch(UUID id, ChurchDto.Request r) {
        Church c = this.requireChurch(id);
        c.setName(r.name().trim());
        c.setCountry(r.country());
        c.setRegion(r.region());
        c.setContactEmail(r.contactEmail());
        return AdminMapper.church(this.churches.save(c));
    }

    public ChurchDto setChurchConsent(UUID id, ChurchDto.ConsentRequest r) {
        Church c = this.requireChurch(id);
        c.setConsentStatus(r.consentStatus());
        return AdminMapper.church(this.churches.save(c));
    }

    // ----------------------------------------------------------------- licences

    public LicenseDto createLicense(LicenseDto.Request r) {
        this.requireChurch(r.churchId());
        License l = new License(r.churchId(), r.consentDocumentUrl(), r.territory(), parseInstant(r.expiresAt()), r.revenueSharePct());
        return AdminMapper.license(this.licenses.save(l));
    }

    @Transactional(readOnly = true)
    public LicenseDto license(UUID id) {
        return AdminMapper.license(this.requireLicense(id));
    }

    @Transactional(readOnly = true)
    public List<LicenseDto> licensesForChurch(UUID churchId) {
        return this.licenses.findByChurchIdOrderByCreatedAtDesc(churchId).stream().map(AdminMapper::license).toList();
    }

    /** Every licence across churches, newest first; {@code status} narrows to one consent status. */
    @Transactional(readOnly = true)
    public List<LicenseDto> listLicenses(String status) {
        if (status == null || status.isBlank()) {
            return this.licenses.findAllByOrderByCreatedAtDesc().stream().map(AdminMapper::license).toList();
        }
        if (!LICENSE_STATUSES.contains(status)) {
            throw new IllegalArgumentException("status must be one of " + String.join(", ", LICENSE_STATUSES));
        }
        return this.licenses.findByConsentStatusOrderByCreatedAtDesc(status).stream().map(AdminMapper::license).toList();
    }

    /**
     * Only the licence changes here. Items already published under it stay published — the
     * trigger fires on the item's transition, not on the licence — so revoking is a separate,
     * deliberate step: withdraw each item. That is a policy the plan leaves to workstream H.
     */
    public LicenseDto setLicenseStatus(UUID id, LicenseDto.StatusRequest r) {
        License l = this.requireLicense(id);
        l.setConsentStatus(r.consentStatus());
        if ("granted".equals(r.consentStatus()) && l.getGrantedAt() == null) {
            l.setGrantedAt(Instant.now());
        }
        l = this.licenses.save(l);
        if (!"granted".equals(l.getConsentStatus())) this.withdrawAllUnder(l.getId());
        return AdminMapper.license(l);
    }

    /**
     * Marks every granted licence whose expiry has passed as expired, and withdraws what it
     * covered. Run on a schedule by {@link LicenceExpirySweep}; returns the items withdrawn.
     */
    public int expireLapsedLicences() {
        int withdrawn = 0;
        for (License l : this.licenses.findByConsentStatusAndExpiresAtLessThanEqual("granted", Instant.now())) {
            l.setConsentStatus("expired");
            this.licenses.save(l);
            withdrawn += this.withdrawAllUnder(l.getId());
        }
        return withdrawn;
    }

    /**
     * Takes every published item off a licence that no longer permits it. The publication gate
     * checks the licence only at the moment an item is published, so without this a revoked or
     * expired licence would leave its items streaming. Granting the licence again does not
     * republish anything: an operator does that, item by item.
     */
    private int withdrawAllUnder(UUID licenseId) {
        List<MediaItem> live = this.mediaItems.findByLicenseIdAndStatus(licenseId, "published");
        for (MediaItem m : live) {
            m.setStatus("withdrawn");
            m.setUpdatedAt(Instant.now());
            this.mediaItems.saveAndFlush(m);
            this.outbox.append("media_item", m.getId(), Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(m));
        }
        return live.size();
    }

    // ----------------------------------------------------------------- artists

    public AdminArtistDto createArtist(AdminArtistDto.Request r) {
        Artist a = new Artist();
        this.applyArtist(a, r);
        try {
            a = this.artists.saveAndFlush(a);
        } catch (DataIntegrityViolationException e) {
            throw new AdminConflictException("an artist with that name or slug already exists");
        }
        this.outbox.append("artist", a.getId(), Topics.CATALOG_ARTIST, AdminMapper.artistEvent(a));
        return AdminMapper.artist(a);
    }

    public AdminArtistDto updateArtist(UUID id, AdminArtistDto.Request r) {
        Artist a = this.requireArtist(id);
        this.applyArtist(a, r);
        try {
            a = this.artists.saveAndFlush(a);
        } catch (DataIntegrityViolationException e) {
            throw new AdminConflictException("an artist with that name or slug already exists");
        }
        this.outbox.append("artist", a.getId(), Topics.CATALOG_ARTIST, AdminMapper.artistEvent(a));
        return AdminMapper.artist(a);
    }

    @Transactional(readOnly = true)
    public AdminArtistDto artist(UUID id) {
        return AdminMapper.artist(this.requireArtist(id));
    }

    @Transactional(readOnly = true)
    public List<AdminArtistDto> listArtists() {
        return this.artists.findAll().stream().map(AdminMapper::artist).toList();
    }

    private void applyArtist(Artist a, AdminArtistDto.Request r) {
        a.setName(r.name().trim());
        a.setSlug(r.slug() == null || r.slug().isBlank() ? slugify(r.name()) : r.slug().trim());
        a.setCoverUrl(r.coverUrl());
        a.setBio(r.bio());
        if (r.churchId() != null) this.requireChurch(r.churchId());
        a.setChurchId(r.churchId());
        if (r.verified() != null) a.setVerified(r.verified());
    }

    // ----------------------------------------------------------------- albums

    public AdminAlbumDto createAlbum(AdminAlbumDto.Request r) {
        Album al = new Album();
        al.setTitle(r.title().trim());
        al.setArtist(this.requireArtist(r.artistId()));
        al.setCoverUrl(r.coverUrl());
        al.setReleaseDate(parseDate(r.releaseDate()));
        try {
            return AdminMapper.album(this.albums.saveAndFlush(al));
        } catch (DataIntegrityViolationException e) {
            throw new AdminConflictException("that artist already has an album with that title");
        }
    }

    public AdminAlbumDto updateAlbum(UUID id, AdminAlbumDto.Update r) {
        Album al = this.albums.findWithArtist(id).orElseThrow(() -> notFound("album", id));
        if (r.title() != null && !r.title().isBlank()) al.setTitle(r.title().trim());
        if (r.coverUrl() != null) al.setCoverUrl(r.coverUrl());
        if (r.releaseDate() != null) al.setReleaseDate(parseDate(r.releaseDate()));
        return AdminMapper.album(this.albums.save(al));
    }

    /** One artist's albums, newest release first; without an artist, every album (capped). */
    @Transactional(readOnly = true)
    public List<AdminAlbumDto> listAlbums(UUID artistId) {
        List<Album> list = artistId == null
            ? this.albums.findAllForAdmin(Limit.of(LIST_LIMIT_MAX))
            : this.albums.findByArtistForAdmin(artistId);
        return list.stream().map(AdminMapper::album).toList();
    }

    @Transactional(readOnly = true)
    public AdminAlbumDto album(UUID id) {
        return AdminMapper.album(this.albums.findWithArtist(id).orElseThrow(() -> notFound("album", id)));
    }

    // ----------------------------------------------------------------- media items

    /** Creates a draft. Nothing is playable or visible until a transcode completes under a granted licence. */
    public AdminMediaItemDto createMedia(AdminMediaItemDto.Request r) {
        MediaItem m = new MediaItem();
        m.setMediaType(MediaType.fromWire(r.mediaType()));
        m.setTitle(r.title().trim());
        m.setArtist(this.requireArtist(r.artistId()));
        m.setAlbum(r.albumId() == null ? null : this.albums.findWithArtist(r.albumId()).orElseThrow(() -> notFound("album", r.albumId())));
        m.setDurationMs(r.durationMs());
        m.setCoverUrl(r.coverUrl());
        m.setGenre(r.genre());
        m.setLanguage(r.language());
        m.setRegion(r.region());
        if (r.popularity() != null) m.setPopularity(r.popularity().shortValue());
        if (r.licenseId() != null) this.requireLicense(r.licenseId());
        m.setLicenseId(r.licenseId());
        m.setStatus("draft");
        m = this.mediaItems.saveAndFlush(m);
        this.outbox.append("media_item", m.getId(), Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(m));
        return AdminMapper.media(m, List.of());
    }

    public AdminMediaItemDto updateMedia(UUID id, AdminMediaItemDto.Update r) {
        MediaItem m = this.requireMedia(id);
        if (r.title() != null && !r.title().isBlank()) m.setTitle(r.title().trim());
        if (r.albumId() != null) m.setAlbum(this.albums.findWithArtist(r.albumId()).orElseThrow(() -> notFound("album", r.albumId())));
        if (r.durationMs() != null) m.setDurationMs(r.durationMs());
        if (r.coverUrl() != null) m.setCoverUrl(r.coverUrl());
        if (r.genre() != null) m.setGenre(r.genre());
        if (r.language() != null) m.setLanguage(r.language());
        if (r.region() != null) m.setRegion(r.region());
        if (r.popularity() != null) m.setPopularity(r.popularity().shortValue());
        if (r.licenseId() != null) {
            this.requireLicense(r.licenseId());
            m.setLicenseId(r.licenseId());
        }
        m.setUpdatedAt(Instant.now());
        m = this.mediaItems.saveAndFlush(m);
        this.outbox.append("media_item", m.getId(), Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(m));
        return AdminMapper.media(m, this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(id));
    }

    @Transactional(readOnly = true)
    public AdminMediaItemDto media(UUID id) {
        return AdminMapper.media(this.requireMedia(id), this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(id));
    }

    /**
     * Items at any status, newest-updated first. Every filter is optional: {@code status},
     * {@code mediaType}, and {@code q}, a case-insensitive substring of the title. Assets are
     * not loaded here; {@link #media} has them.
     */
    @Transactional(readOnly = true)
    public List<AdminMediaItemDto> listMedia(String status, String mediaType, String q, int limit) {
        CriteriaBuilder cb = this.entityManager.getCriteriaBuilder();
        CriteriaQuery<MediaItem> query = cb.createQuery(MediaItem.class);
        Root<MediaItem> m = query.from(MediaItem.class);
        m.fetch("artist");
        m.fetch("album", JoinType.LEFT);
        List<Predicate> where = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            // Unvalidated, as before RFC 0001: an unknown status matches nothing (200, empty).
            where.add(cb.equal(m.get("status"), status));
        }
        if (mediaType != null && !mediaType.isBlank()) {
            where.add(cb.equal(m.get("mediaType"), MediaType.fromWire(mediaType)));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            where.add(cb.like(cb.lower(m.get("title")), pattern, '\\'));
        }
        query.select(m).where(where.toArray(Predicate[]::new)).orderBy(cb.desc(m.get("updatedAt")));
        return this.entityManager.createQuery(query)
            .setMaxResults(Math.min(Math.max(1, limit), LIST_LIMIT_MAX))
            .getResultList()
            .stream()
            .map(item -> AdminMapper.media(item, List.of()))
            .toList();
    }

    /**
     * {@code {profile: url}} for every stored asset, whatever the item's status, so an operator can
     * listen before publishing. Built the way StreamService builds a playback target.
     *
     * <p>Only where that target is the local media origin. Anywhere else it would be the CDN origin,
     * unsigned, and the contract forbids returning an unsigned media URL; production needs signed
     * CDN URLs here first (RFC 0001), so until then this is 501 outside local development.
     */
    @Transactional(readOnly = true)
    public Map<String, String> preview(UUID id) {
        if (this.catalog.getLocalMediaRoot() == null || this.catalog.getLocalMediaRoot().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                "previews need signed media URLs, which this instance cannot issue yet; only local development serves them");
        }
        this.requireMedia(id);
        Map<String, String> urls = new LinkedHashMap<>();
        for (MediaAsset a : this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(id)) {
            urls.put(a.getProfile(), this.catalog.mediaOrigin() + "/" + a.getStorageKey());
        }
        return urls;
    }

    /**
     * Records where the master landed and asks workstream D for the derivatives. The item moves
     * to 'processing'; the {@code completed} event moves it on. Allowed from draft or failed
     * (a retry); re-transcoding a published item is a withdraw first, deliberately.
     */
    public AdminMediaItemDto requestTranscode(UUID id, AdminMediaItemDto.TranscodeRequest r) {
        MediaItem m = this.requireMedia(id);
        String key = r.masterStorageKey().trim();
        // Only the item's own master. A key naming another item's master would publish that
        // audio under this item's licence, which the publication gate cannot see.
        if (!MasterKeys.isKeyFor(id, key)) {
            throw new IllegalArgumentException("masterStorageKey must be this item's own master: masters/" + id + "/original.{ext}");
        }
        if (!List.of("draft", "failed").contains(m.getStatus())) {
            throw new AdminConflictException("a transcode can be requested from draft or failed, not from " + m.getStatus());
        }
        m.setMasterStorageKey(key);
        m.setStatus("processing");
        // A new run's verdict replaces the last one's; until it lands there is none.
        m.setReviewFlags(List.of());
        m.setFailureReason(null);
        m.setUpdatedAt(Instant.now());
        m = this.mediaItems.saveAndFlush(m);

        UUID eventId = UUID.randomUUID();
        String ladder = BitrateLadder.ladderFor(m.getMediaType());
        this.outbox.append("media_item", m.getId(), Topics.AUDIO_TRANSCODE,
            AdminMapper.transcodeRequested(eventId, m, ladder, 1, Instant.now().toString()), eventId);
        this.outbox.append("media_item", m.getId(), Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(m));
        return AdminMapper.media(m, List.of());
    }

    /**
     * Re-publishes an item that has playable outputs — a withdrawn item coming back, or one whose
     * transcode finished before its licence was granted. The licence check is the database's;
     * the pre-check here only exists to give the operator a sentence instead of a constraint name.
     */
    public AdminMediaItemDto publish(UUID id) {
        MediaItem m = this.requireMedia(id);
        if ("published".equals(m.getStatus())) return this.media(id);
        if (this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(id).isEmpty() && m.getSeedSourceUrl() == null) {
            throw new AdminConflictException("nothing to play: request a transcode and wait for it to complete");
        }
        if (m.getLicenseId() == null) {
            throw new AdminConflictException("no licence attached");
        }
        License l = this.requireLicense(m.getLicenseId());
        if (!"granted".equals(l.getConsentStatus())) {
            throw new AdminConflictException("licence " + l.getId() + " is " + l.getConsentStatus() + ", not granted");
        }
        MediaItem published;
        try {
            published = this.publication.publish(id);
        } catch (DataIntegrityViolationException e) {
            // The trigger's verdict, when the pre-checks and the database disagree (e.g. expiry).
            throw new AdminConflictException("the database refused publication: licence not granted or expired");
        }
        // The entity loaded above is stale now — publish() committed in its own transaction.
        return AdminMapper.media(published, this.assets.findByMediaItemIdOrderByBitrateKbpsAsc(id));
    }

    public AdminMediaItemDto withdraw(UUID id) {
        MediaItem m = this.requireMedia(id);
        if (!"published".equals(m.getStatus())) {
            throw new AdminConflictException("only a published item can be withdrawn; this one is " + m.getStatus());
        }
        m.setStatus("withdrawn");
        m.setUpdatedAt(Instant.now());
        m = this.mediaItems.saveAndFlush(m);
        this.outbox.append("media_item", m.getId(), Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(m));
        return this.media(id);
    }

    // ----------------------------------------------------------------- helpers

    private Church requireChurch(UUID id) {
        return this.churches.findById(id).orElseThrow(() -> notFound("church", id));
    }

    private License requireLicense(UUID id) {
        return this.licenses.findById(id).orElseThrow(() -> notFound("licence", id));
    }

    private Artist requireArtist(UUID id) {
        return this.artists.findById(id).orElseThrow(() -> notFound("artist", id));
    }

    private MediaItem requireMedia(UUID id) {
        return this.mediaItems.findAnyStatus(id).orElseThrow(() -> notFound("media item", id));
    }

    private static ResponseStatusException notFound(String what, UUID id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, what + " " + id + " not found");
    }

    static String slugify(String name) {
        String s = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return s.isEmpty() ? "artist-" + UUID.randomUUID().toString().substring(0, 8) : s;
    }

    private static Instant parseInstant(String iso) {
        try {
            return iso == null || iso.isBlank() ? null : Instant.parse(iso);
        } catch (Exception e) {
            throw new IllegalArgumentException("not an ISO-8601 instant: " + iso);
        }
    }

    private static LocalDate parseDate(String iso) {
        try {
            return iso == null || iso.isBlank() ? null : LocalDate.parse(iso);
        } catch (Exception e) {
            throw new IllegalArgumentException("not an ISO-8601 date: " + iso);
        }
    }
}
