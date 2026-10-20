package org.adventwave.platform.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Generated;
import org.adventwave.contracts.api.UserSettingsDto;

@Entity
@Table(
    name = "user_settings"
)
public class UserSettings {
    @Id
    @Column(
        name = "user_id",
        nullable = false,
        updatable = false
    )
    private UUID userId;
    @Column(
        nullable = false
    )
    private String theme = "light";
    @Column(
        name = "private_session",
        nullable = false
    )
    private boolean privateSession;
    @Column(
        name = "normalize_audio",
        nullable = false
    )
    private boolean normalizeAudio;
    @Column(
        name = "crossfade_enabled",
        nullable = false
    )
    private boolean crossfadeEnabled;
    @Column(
        name = "crossfade_sec",
        nullable = false
    )
    private short crossfadeSec = 6;
    @Column(
        name = "sidebar_collapsed",
        nullable = false
    )
    private boolean sidebarCollapsed;
    @Column(
        name = "friend_activity_collapsed",
        nullable = false
    )
    private boolean friendActivityCollapsed;
    @Column(
        name = "audio_quality",
        nullable = false
    )
    private String audioQuality = "normal";
    /** RFC 0004: when the queue ends, keep playing something similar. */
    @Column(
        name = "autoplay",
        nullable = false
    )
    private boolean autoplay = true;
    /** RFC 0007: the people who follow this listener see what they are playing. */
    @Column(
        name = "share_activity",
        nullable = false
    )
    private boolean shareActivity = true;
    @Column(
        name = "updated_at",
        nullable = false
    )
    private Instant updatedAt = Instant.now();

    public UserSettings(UUID userId) {
        this.userId = userId;
    }

    public UserSettingsDto toDto() {
        return new UserSettingsDto(
            this.theme,
            this.privateSession,
            this.normalizeAudio,
            this.crossfadeEnabled,
            this.crossfadeSec,
            this.sidebarCollapsed,
            this.friendActivityCollapsed,
            this.audioQuality,
            this.autoplay,
            this.shareActivity
        );
    }

    public void apply(UserSettingsDto dto) {
        if (dto.theme() != null) {
            this.theme = dto.theme();
        }

        if (dto.audioQuality() != null) {
            this.audioQuality = dto.audioQuality();
        }

        if (dto.autoplay() != null) {
            this.autoplay = dto.autoplay();
        }

        if (dto.shareActivity() != null) {
            this.shareActivity = dto.shareActivity();
        }

        this.privateSession = dto.privateSession();
        this.normalizeAudio = dto.normalizeAudio();
        this.crossfadeEnabled = dto.crossfadeEnabled();
        this.crossfadeSec = (short)dto.crossfadeSec();
        this.sidebarCollapsed = dto.sidebarCollapsed();
        this.friendActivityCollapsed = dto.friendActivityCollapsed();
        this.updatedAt = Instant.now();
    }

    @Generated
    public UUID getUserId() {
        return this.userId;
    }

    @Generated
    public String getTheme() {
        return this.theme;
    }

    @Generated
    public boolean isPrivateSession() {
        return this.privateSession;
    }

    @Generated
    public boolean isNormalizeAudio() {
        return this.normalizeAudio;
    }

    @Generated
    public boolean isCrossfadeEnabled() {
        return this.crossfadeEnabled;
    }

    @Generated
    public short getCrossfadeSec() {
        return this.crossfadeSec;
    }

    @Generated
    public boolean isSidebarCollapsed() {
        return this.sidebarCollapsed;
    }

    @Generated
    public boolean isFriendActivityCollapsed() {
        return this.friendActivityCollapsed;
    }

    public boolean isShareActivity() {
        return this.shareActivity;
    }

    @Generated
    public String getAudioQuality() {
        return this.audioQuality;
    }

    @Generated
    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    @Generated
    public void setUserId(final UUID userId) {
        this.userId = userId;
    }

    @Generated
    public void setTheme(final String theme) {
        this.theme = theme;
    }

    @Generated
    public void setPrivateSession(final boolean privateSession) {
        this.privateSession = privateSession;
    }

    @Generated
    public void setNormalizeAudio(final boolean normalizeAudio) {
        this.normalizeAudio = normalizeAudio;
    }

    @Generated
    public void setCrossfadeEnabled(final boolean crossfadeEnabled) {
        this.crossfadeEnabled = crossfadeEnabled;
    }

    @Generated
    public void setCrossfadeSec(final short crossfadeSec) {
        this.crossfadeSec = crossfadeSec;
    }

    @Generated
    public void setSidebarCollapsed(final boolean sidebarCollapsed) {
        this.sidebarCollapsed = sidebarCollapsed;
    }

    @Generated
    public void setFriendActivityCollapsed(final boolean friendActivityCollapsed) {
        this.friendActivityCollapsed = friendActivityCollapsed;
    }

    @Generated
    public void setAudioQuality(final String audioQuality) {
        this.audioQuality = audioQuality;
    }

    @Generated
    public void setUpdatedAt(final Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Generated
    public UserSettings() {
    }
}
