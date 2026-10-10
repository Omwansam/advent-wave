package org.adventwave.gateway.admin;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.admin.MasterUploadDto;
import org.adventwave.gateway.audio.AudioProperties;
import org.adventwave.gateway.upload.MasterKeys;
import org.adventwave.gateway.upload.MasterUploads;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * The first step of adding a recording (RFC 0001): decide whether this item may receive a master,
 * and where the client should send it. The bytes never come through here — the client PUTs them
 * to the returned URL (plan §11.7) — and nothing is written: the item records its master key
 * when the transcode is requested, after the upload has landed.
 */
@Service
@Transactional(readOnly = true)
public class MasterUploadService {
    private final CatalogRepositories.MediaItemRepository mediaItems;
    private final ObjectProvider<MasterUploads> uploads;
    private final AudioProperties audio;

    public MasterUploadService(
        CatalogRepositories.MediaItemRepository mediaItems,
        ObjectProvider<MasterUploads> uploads,
        AudioProperties audio
    ) {
        this.mediaItems = mediaItems;
        this.uploads = uploads;
        this.audio = audio;
    }

    public MasterUploadDto issue(UUID mediaItemId, MasterUploadDto.UploadRequest r) {
        MediaItem m = this.mediaItems.findAnyStatus(mediaItemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "media item " + mediaItemId + " not found"));
        if (!List.of("draft", "failed").contains(m.getStatus())) {
            throw new AdminConflictException("a master can be uploaded to a draft or failed item, not to a " + m.getStatus() + " one");
        }
        String ext = MasterKeys.extensionOf(r.filename());
        if (ext.isEmpty()) {
            throw new IllegalArgumentException("'" + r.filename() + "' is not an accepted master; use one of " + String.join(", ", MasterKeys.EXTENSIONS));
        }
        long max = this.audio.getMaxUploadBytes().toBytes();
        if (r.sizeBytes() > max) {
            throw new IllegalArgumentException("the file is " + r.sizeBytes() + " bytes; the largest master accepted is " + max + " bytes");
        }
        MasterUploads target = this.uploads.getIfAvailable();
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "no master storage is configured on this instance");
        }
        target.existingMaster(mediaItemId).ifPresent(key -> {
            throw new AdminConflictException(key + " already exists; masters are never replaced");
        });

        String key = MasterKeys.keyFor(mediaItemId, ext);
        String contentType = r.contentType() == null || r.contentType().isBlank() ? "application/octet-stream" : r.contentType();
        MasterUploads.Ticket ticket = target.issue(mediaItemId, key, contentType, r.sizeBytes());
        return new MasterUploadDto(ticket.uploadUrl(), "PUT", key, ticket.expiresAt().toString());
    }
}
