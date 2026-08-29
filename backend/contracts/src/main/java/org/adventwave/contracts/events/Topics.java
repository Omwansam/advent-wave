package org.adventwave.contracts.events;

public final class Topics {
    public static final String CATALOG_MEDIA = "catalog.media.v1";
    public static final String CATALOG_ARTIST = "catalog.artist.v1";
    public static final String CATALOG_PLAYLIST = "catalog.playlist.v1";
    public static final String PLAYBACK_EVENTS = "playback.events.v1";
    public static final String LIBRARY_EVENTS = "library.events.v1";
    public static final String AUDIO_TRANSCODE = "audio.transcode.v1";

    private Topics() {
    }

    public static final class Aggregate {
        public static final String MEDIA_ITEM = "media_item";
        public static final String ARTIST = "artist";
        public static final String PLAYLIST = "playlist";
        public static final String LIBRARY = "library";
        public static final String PLAYBACK = "playback";

        private Aggregate() {
        }
    }
}
