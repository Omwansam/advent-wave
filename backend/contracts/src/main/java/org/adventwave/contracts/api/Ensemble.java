package org.adventwave.contracts.api;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Which of a church's choirs this is (RFC 0009). Only a {@link ArtistKind#CHOIR} has one. */
public enum Ensemble {
    MAIN("main"),
    YOUTH("youth"),
    CHILDREN("children"),
    WOMEN("women"),
    MEN("men"),
    OTHER("other");

    private final String wireValue;

    private Ensemble(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return this.wireValue;
    }

    @JsonCreator
    public static Ensemble fromWire(String value) {
        for (Ensemble ensemble : values()) {
            if (ensemble.wireValue.equalsIgnoreCase(value)) {
                return ensemble;
            }
        }

        throw new IllegalArgumentException("unknown ensemble: " + value);
    }
}
