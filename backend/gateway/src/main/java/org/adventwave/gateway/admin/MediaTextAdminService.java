package org.adventwave.gateway.admin;

import java.time.Instant;
import java.util.UUID;
import org.adventwave.catalog.MediaTextService;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.ChaptersDto;
import org.adventwave.contracts.api.ChaptersUpdateDto;
import org.adventwave.contracts.api.LyricsDto;
import org.adventwave.contracts.api.LyricsUpdateDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.events.Topics;
import org.adventwave.platform.outbox.OutboxWriter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lyrics and chapters on the ingest side (RFC 0004), at any status, so an editor can prepare them
 * before an item is published. Each write is catalogue state, so it re-announces the item on
 * {@code catalog.media.v1} in the same transaction, as every other catalogue write does.
 */
@Service
@Transactional
public class MediaTextAdminService {
    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final MediaTextService text;
    private final OutboxWriter outbox;

    public MediaTextAdminService(CatalogRepositories.MediaItemRepository mediaItems, MediaTextService text, OutboxWriter outbox) {
        this.mediaItems = mediaItems;
        this.text = text;
        this.outbox = outbox;
    }

    @Transactional(readOnly = true)
    public LyricsDto lyrics(UUID id) {
        this.requireMedia(id);
        return this.text.lyrics(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no lyrics for media item " + id));
    }

    public LyricsDto saveLyrics(UUID id, LyricsUpdateDto update) {
        MediaItem m = this.requireMedia(id);
        if (m.getMediaType() != MediaType.SONG) {
            throw new IllegalArgumentException("lyrics are kept for songs; a sermon or podcast takes chapters");
        }
        LyricsDto saved = this.text.replaceLyrics(id, update);
        this.announce(m);
        return saved;
    }

    /** Idempotent: deleting lyrics that are not there changes nothing and announces nothing. */
    public void deleteLyrics(UUID id) {
        MediaItem m = this.requireMedia(id);
        if (this.text.deleteLyrics(id)) {
            this.announce(m);
        }
    }

    @Transactional(readOnly = true)
    public ChaptersDto chapters(UUID id) {
        this.requireMedia(id);
        return this.text.chapters(id);
    }

    public ChaptersDto saveChapters(UUID id, ChaptersUpdateDto update) {
        MediaItem m = this.requireMedia(id);
        if (!m.getMediaType().isSpeech()) {
            throw new IllegalArgumentException("chapters are kept for sermons and podcasts; a song takes lyrics");
        }
        ChaptersDto saved = this.text.replaceChapters(id, m.getDurationMs(), update);
        this.announce(m);
        return saved;
    }

    private void announce(MediaItem m) {
        m.setUpdatedAt(Instant.now());
        MediaItem saved = this.mediaItems.saveAndFlush(m);
        this.outbox.append("media_item", saved.getId(), Topics.CATALOG_MEDIA, AdminMapper.mediaEvent(saved));
    }

    private MediaItem requireMedia(UUID id) {
        return this.mediaItems.findAnyStatus(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "media item " + id + " not found"));
    }
}
