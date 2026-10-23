package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Generated;

/**
 * A unit of the church's structure in Kenya (RFC 0009): the division, a union, or a conference or
 * field. Reference data from V11; nothing in the application writes it.
 */
@Entity
@Table(
    name = "conferences"
)
public class Conference {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private String id;
    @Column(
        nullable = false
    )
    private String name;
    @Column(
        name = "short_name"
    )
    private String shortName;
    /** division | union | conference | field */
    @Column(
        nullable = false
    )
    private String kind;
    @Column(
        name = "parent_id"
    )
    private String parentId;
    @Column
    private String headquarters;
    @Column
    private String website;
    @Column(
        name = "sort_order",
        nullable = false
    )
    private int sortOrder;

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public String getName() {
        return this.name;
    }

    @Generated
    public String getShortName() {
        return this.shortName;
    }

    @Generated
    public String getKind() {
        return this.kind;
    }

    @Generated
    public String getParentId() {
        return this.parentId;
    }

    @Generated
    public String getHeadquarters() {
        return this.headquarters;
    }

    @Generated
    public String getWebsite() {
        return this.website;
    }

    @Generated
    public int getSortOrder() {
        return this.sortOrder;
    }
}
