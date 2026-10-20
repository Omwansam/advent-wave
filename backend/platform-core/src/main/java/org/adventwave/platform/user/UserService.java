package org.adventwave.platform.user;

import java.util.UUID;
import org.adventwave.contracts.api.UserDto;
import org.adventwave.contracts.api.UserSettingsDto;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.domain.UserSettings;
import org.adventwave.platform.repo.PlatformRepositories;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final PlatformRepositories.UserAccountRepository users;
    private final PlatformRepositories.UserSettingsRepository settings;
    private final PlatformRepositories.ListenerCredentialRepository credentials;
    private final PlatformRepositories.ListenerActivityRepository activity;

    public UserService(
        PlatformRepositories.UserAccountRepository users,
        PlatformRepositories.UserSettingsRepository settings,
        PlatformRepositories.ListenerCredentialRepository credentials,
        PlatformRepositories.ListenerActivityRepository activity
    ) {
        this.users = users;
        this.settings = settings;
        this.credentials = credentials;
        this.activity = activity;
    }

    @Transactional
    public UserAccount provision(String externalAuthId, String email, String displayName, String region) {
        return this.users.findByExternalAuthId(externalAuthId).map(existing -> {
            if (email != null && !email.equals(existing.getEmail())) {
                existing.setEmail(email);
            }

            if (displayName != null && !displayName.equals(existing.getDisplayName())) {
                existing.setDisplayName(displayName);
            }

            return (UserAccount)existing;
        }).orElseGet(() -> {
            UserAccount useraccount = new UserAccount(externalAuthId, email, displayName, region);
            this.users.save(useraccount);
            this.settings.save(new UserSettings(useraccount.getId()));
            return useraccount;
        });
    }

    @Transactional(
        readOnly = true
    )
    public UserAccount require(UUID userId) {
        return (UserAccount)this.users.findById(userId).orElseThrow(() -> new IllegalArgumentException("unknown user " + userId));
    }

    @Transactional(
        readOnly = true
    )
    public UserDto toDto(UserAccount user) {
        Boolean verified = this.credentials.findById(user.getId()).map(c -> c.getEmailVerifiedAt() != null).orElse(null);
        return new UserDto(user.getId().toString(), user.getEmail(), user.getDisplayName(), user.getRegion(), user.getCreatedAt().toString(), verified);
    }

    @Transactional
    public UserSettingsDto getSettings(UUID userId) {
        return this.settings.findById(userId).orElseGet(() -> (UserSettings)this.settings.save(new UserSettings(userId))).toDto();
    }

    @Transactional
    public UserSettingsDto updateSettings(UUID userId, UserSettingsDto update) {
        UserSettings usersettings = this.settings.findById(userId).orElseGet(() -> new UserSettings(userId));
        usersettings.apply(update);
        if (usersettings.isPrivateSession() || !usersettings.isShareActivity()) {
            // RFC 0007: what was playing before stays hidden, even once sharing is back on.
            this.activity.clear(userId);
        }
        return ((UserSettings)this.settings.save(usersettings)).toDto();
    }

    @Transactional(
        readOnly = true
    )
    public boolean isPrivateSession(UUID userId) {
        return this.settings.findById(userId).map(UserSettings::isPrivateSession).orElse(false);
    }
}
