package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * What a profile is (RFC 0009). Every artist is one of these; recordings, follows and play counts
 * work the same for all of them.
 */
public enum ArtistKind {
    /** A congregation's own profile: its sermons and podcasts, and the home of its choirs. */
    CHURCH("church"),
    /** A choir; its {@link Ensemble} says which. */
    CHOIR("choir"),
    /** A ministry group, band, quartet or acapella ensemble. */
    GROUP("group"),
    /** One singer or musician. */
    SOLOIST("soloist"),
    /** A pastor or speaker. */
    PREACHER("preacher"),
    /** A media ministry or organisation: a radio station, a conference department, a podcast. */
    MINISTRY("ministry");

    private final String wireValue;

    private ArtistKind(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return this.wireValue;
    }

    @JsonCreator
    public static ArtistKind fromWire(String value) {
        for (ArtistKind kind : values()) {
            if (kind.wireValue.equalsIgnoreCase(value)) {
                return kind;
            }
        }

        throw new IllegalArgumentException("unknown artist kind: " + value);
    }

    /** Choirs, groups and singers: the profiles a "popular choirs" row is made of. */
    public boolean isMusical() {
        return this == CHOIR || this == GROUP || this == SOLOIST;
    }
}
