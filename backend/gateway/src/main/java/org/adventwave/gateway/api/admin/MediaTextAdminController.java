package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import java.util.UUID;
import org.adventwave.contracts.api.ChaptersDto;
import org.adventwave.contracts.api.ChaptersUpdateDto;
import org.adventwave.contracts.api.LyricsDto;
import org.adventwave.contracts.api.LyricsUpdateDto;
import org.adventwave.gateway.admin.MediaTextAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Song lyrics and sermon chapters for editors (RFC 0004). Reads need {@code catalog:read},
 * writes {@code media:write} — both by AdminAccessRules' catch-all rules, nothing added there.
 * Method names are the operationIds, so they say which text they act on.
 */
@RestController
@RequestMapping("/v1/admin/media/{id}")
public class MediaTextAdminController {
    private final MediaTextAdminService text;

    public MediaTextAdminController(MediaTextAdminService text) {
        this.text = text;
    }

    @GetMapping("/lyrics")
    public LyricsDto mediaLyrics(@PathVariable UUID id) {
        return this.text.lyrics(id);
    }

    @PutMapping("/lyrics")
    public LyricsDto saveLyrics(@PathVariable UUID id, @Valid @RequestBody LyricsUpdateDto update) {
        return this.text.saveLyrics(id, update);
    }

    @DeleteMapping("/lyrics")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLyrics(@PathVariable UUID id) {
        this.text.deleteLyrics(id);
    }

    @GetMapping("/chapters")
    public ChaptersDto mediaChapters(@PathVariable UUID id) {
        return this.text.chapters(id);
    }

    @PutMapping("/chapters")
    public ChaptersDto saveChapters(@PathVariable UUID id, @Valid @RequestBody ChaptersUpdateDto update) {
        return this.text.saveChapters(id, update);
    }
}
