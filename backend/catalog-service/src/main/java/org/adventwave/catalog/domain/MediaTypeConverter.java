package org.adventwave.catalog.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.adventwave.contracts.api.MediaType;

@Converter(
    autoApply = true
)
public class MediaTypeConverter implements AttributeConverter<MediaType, String> {
    public String convertToDatabaseColumn(MediaType attribute) {
        return attribute == null ? null : attribute.wireValue();
    }

    public MediaType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : MediaType.fromWire(dbData);
    }
}
