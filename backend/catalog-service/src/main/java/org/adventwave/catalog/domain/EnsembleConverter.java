package org.adventwave.catalog.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.adventwave.contracts.api.Ensemble;

/** The ensemble column holds the wire value (RFC 0009), as media_type does (MediaTypeConverter). */
@Converter(
    autoApply = true
)
public class EnsembleConverter implements AttributeConverter<Ensemble, String> {
    public String convertToDatabaseColumn(Ensemble attribute) {
        return attribute == null ? null : attribute.wireValue();
    }

    public Ensemble convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Ensemble.fromWire(dbData);
    }
}
