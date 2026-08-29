package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MediaType {
    SONG("song"),
    SERMON("sermon"),
    PODCAST("podcast");

    private final String wireValue;

    private MediaType(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return this.wireValue;
    }

    @JsonCreator
    public static MediaType fromWire(String value) {
        MediaType[] amediatype;
        for (MediaType mediatype : amediatype = values()) {
            if (mediatype.wireValue.equalsIgnoreCase(value)) {
                return mediatype;
            }
        }

        throw new IllegalArgumentException("unknown media_type: " + value);
    }

    public boolean isSpeech() {
        return this == SERMON || this == PODCAST;
    }
}
