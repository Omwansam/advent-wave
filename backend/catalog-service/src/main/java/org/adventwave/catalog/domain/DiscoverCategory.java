package org.adventwave.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import lombok.Generated;

@Entity
@Table(
    name = "discover_categories"
)
public class DiscoverCategory {
    @Id
    @Column(
        nullable = false,
        updatable = false
    )
    private String id;
    @Column(
        nullable = false
    )
    private String label;
    @Column
    private String gradient;
    @Column(
        name = "cover_url"
    )
    private String coverUrl;
    @Column(
        name = "sort_order",
        nullable = false
    )
    private short sortOrder;

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public String getLabel() {
        return this.label;
    }

    @Generated
    public String getGradient() {
        return this.gradient;
    }

    @Generated
    public String getCoverUrl() {
        return this.coverUrl;
    }

    @Generated
    public short getSortOrder() {
        return this.sortOrder;
    }

    @Generated
    public void setId(final String id) {
        this.id = id;
    }

    @Generated
    public void setLabel(final String label) {
        this.label = label;
    }

    @Generated
    public void setGradient(final String gradient) {
        this.gradient = gradient;
    }

    @Generated
    public void setCoverUrl(final String coverUrl) {
        this.coverUrl = coverUrl;
    }

    @Generated
    public void setSortOrder(final short sortOrder) {
        this.sortOrder = sortOrder;
    }

    @Entity
    @Table(
        name = "discover_category_items"
    )
    public static class Item {
        @EmbeddedId
        private DiscoverCategory.Item.Key id;
        @Column(
            nullable = false
        )
        private int position;

        public UUID getMediaItemId() {
            return this.id.getMediaItemId();
        }

        @Generated
        public DiscoverCategory.Item.Key getId() {
            return this.id;
        }

        @Generated
        public int getPosition() {
            return this.position;
        }

        @Generated
        public void setId(final DiscoverCategory.Item.Key id) {
            this.id = id;
        }

        @Generated
        public void setPosition(final int position) {
            this.position = position;
        }

        @Embeddable
        public static class Key implements Serializable {
            @Column(
                name = "category_id",
                nullable = false
            )
            private String categoryId;
            @Column(
                name = "media_item_id",
                nullable = false
            )
            private UUID mediaItemId;

            @Override
            public boolean equals(Object other) {
                if (this == other) {
                    return true;
                } else {
                    return other instanceof DiscoverCategory.Item.Key key
                        ? Objects.equals(this.categoryId, key.categoryId) && Objects.equals(this.mediaItemId, key.mediaItemId)
                        : false;
                }
            }

            @Override
            public int hashCode() {
                return Objects.hash(this.categoryId, this.mediaItemId);
            }

            @Generated
            public String getCategoryId() {
                return this.categoryId;
            }

            @Generated
            public UUID getMediaItemId() {
                return this.mediaItemId;
            }

            @Generated
            public void setCategoryId(final String categoryId) {
                this.categoryId = categoryId;
            }

            @Generated
            public void setMediaItemId(final UUID mediaItemId) {
                this.mediaItemId = mediaItemId;
            }
        }
    }
}
