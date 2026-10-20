package org.adventwave.catalog;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.adventwave.catalog.domain.MediaChapter;
import org.adventwave.catalog.domain.MediaLyrics;
import org.adventwave.catalog.repo.CatalogRepositories;
import org.adventwave.contracts.api.ChapterDto;
import org.adventwave.contracts.api.ChaptersDto;
import org.adventwave.contracts.api.ChaptersUpdateDto;
import org.adventwave.contracts.api.LyricLineDto;
import org.adventwave.contracts.api.LyricsDto;
import org.adventwave.contracts.api.LyricsUpdateDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The words of songs and the chapters of sermons and podcasts (RFC 0004). Stores and validates
 * the text; whether an item may have it (its media type, its status) is the caller's check, and
 * so is the outbox row a write owes.
 */
@Service
public class MediaTextService {
    private final CatalogRepositories.MediaLyricsRepository lyrics;
    private final CatalogRepositories.MediaChapterRepository chapters;

    public MediaTextService(CatalogRepositories.MediaLyricsRepository lyrics, CatalogRepositories.MediaChapterRepository chapters) {
        this.lyrics = lyrics;
        this.chapters = chapters;
    }

    // ------------------------------------------------------------------- lyrics

    @Transactional(
        readOnly = true
    )
    public Optional<LyricsDto> lyrics(UUID mediaItemId) {
        return this.lyrics.findById(mediaItemId).map(MediaTextService::toDto);
    }

    @Transactional(
        readOnly = true
    )
    public Optional<MediaLyrics> lyricsEntity(UUID mediaItemId) {
        return this.lyrics.findById(mediaItemId);
    }

    @Transactional
    public LyricsDto replaceLyrics(UUID mediaItemId, LyricsUpdateDto update) {
        List<LyricLineDto> in = update.lines();
        for (LyricLineDto line : in) {
            if (line.text().contains("\n") || line.text().contains("\r")) {
                throw new IllegalArgumentException("a lyric line cannot contain a line break; send one line per entry");
            }
        }
        if (in.stream().allMatch(l -> l.text().isBlank())) {
            throw new IllegalArgumentException("lyrics need at least one line of words");
        }
        long timed = in.stream().filter(l -> l.startMs() != null).count();
        if (timed != 0 && timed != in.size()) {
            // A half-timed text cannot be highlighted honestly: the untimed lines have no place.
            throw new IllegalArgumentException("every line needs a startMs, or none may have one");
        }
        for (int i = 1; timed > 0 && i < in.size(); i++) {
            if (in.get(i).startMs() <= in.get(i - 1).startMs()) {
                throw new IllegalArgumentException("line " + (i + 1) + " starts no later than the line before it");
            }
        }

        MediaLyrics row = this.lyrics.findById(mediaItemId).orElseGet(() -> new MediaLyrics(mediaItemId));
        row.setLanguage(blankToNull(update.language()));
        row.setRightsBasis(update.rightsBasis());
        row.setCredit(update.credit().trim());
        row.replaceLines(in.stream().map(l -> new MediaLyrics.Line(l.startMs(), l.text().stripTrailing())).toList());
        row.setUpdatedAt(Instant.now());
        return toDto(this.lyrics.saveAndFlush(row));
    }

    /** @return false when there was nothing to delete. */
    @Transactional
    public boolean deleteLyrics(UUID mediaItemId) {
        if (!this.lyrics.existsById(mediaItemId)) {
            return false;
        }
        this.lyrics.deleteById(mediaItemId);
        this.lyrics.flush();
        return true;
    }

    public static LyricsDto toDto(MediaLyrics row) {
        return new LyricsDto(
            row.getMediaItemId().toString(),
            row.isSynced(),
            row.getLines().stream().map(l -> new LyricLineDto(l.getStartMs(), l.getText())).toList(),
            row.getLanguage(),
            row.getRightsBasis(),
            row.getCredit(),
            row.getUpdatedAt().toString()
        );
    }

    /** The first line containing {@code query}, case-insensitively; the search text says one does. */
    public static String firstMatchingLine(MediaLyrics row, String query) {
        String q = query.toLowerCase();
        return row.getLines()
            .stream()
            .map(MediaLyrics.Line::getText)
            .filter(t -> t.toLowerCase().contains(q))
            .findFirst()
            // The match spans a line break: show the start of the words instead of nothing.
            .orElse(row.getLines().stream().map(MediaLyrics.Line::getText).filter(t -> !t.isBlank()).findFirst().orElse(""));
    }

    // ------------------------------------------------------------------ chapters

    @Transactional(
        readOnly = true
    )
    public ChaptersDto chapters(UUID mediaItemId) {
        return new ChaptersDto(
            mediaItemId.toString(),
            this.chapters
                .findByIdMediaItemIdOrderByIdPositionAsc(mediaItemId)
                .stream()
                .map(c -> new ChapterDto(c.getStartMs(), c.getTitle()))
                .toList()
        );
    }

    /**
     * Replaces the item's chapters; an empty list clears them.
     *
     * @param durationMs the item's catalogue duration; 0 when unknown, and then not checked
     */
    @Transactional
    public ChaptersDto replaceChapters(UUID mediaItemId, int durationMs, ChaptersUpdateDto update) {
        List<ChapterDto> in = update.chapters();
        for (int i = 0; i < in.size(); i++) {
            ChapterDto c = in.get(i);
            if (i > 0 && c.startMs() <= in.get(i - 1).startMs()) {
                throw new IllegalArgumentException("chapter " + (i + 1) + " starts no later than the chapter before it");
            }
            if (durationMs > 0 && c.startMs() >= durationMs) {
                throw new IllegalArgumentException("chapter " + (i + 1) + " starts after the item ends");
            }
        }

        this.chapters.deleteForItem(mediaItemId);
        List<MediaChapter> rows = new ArrayList<>(in.size());
        for (int i = 0; i < in.size(); i++) {
            rows.add(new MediaChapter(mediaItemId, (short) i, in.get(i).startMs(), in.get(i).title().trim()));
        }
        this.chapters.saveAllAndFlush(rows);
        return this.chapters(mediaItemId);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
