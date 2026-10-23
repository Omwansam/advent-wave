package org.adventwave.catalog.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.adventwave.contracts.api.ArtistKind;

/** The artist kind column holds the wire value (RFC 0009), as media_type does (MediaTypeConverter). */
@Converter(
    autoApply = true
)
public class ArtistKindConverter implements AttributeConverter<ArtistKind, String> {
    public String convertToDatabaseColumn(ArtistKind attribute) {
        return attribute == null ? null : attribute.wireValue();
    }

    public ArtistKind convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ArtistKind.fromWire(dbData);
    }
}
