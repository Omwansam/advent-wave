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

    public UserService(PlatformRepositories.UserAccountRepository users, PlatformRepositories.UserSettingsRepository settings) {
        this.users = users;
        this.settings = settings;
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
        return new UserDto(user.getId().toString(), user.getEmail(), user.getDisplayName(), user.getRegion(), user.getCreatedAt().toString());
    }

    @Transactional
    public UserSettingsDto getSettings(UUID userId) {
        return this.settings.findById(userId).orElseGet(() -> (UserSettings)this.settings.save(new UserSettings(userId))).toDto();
    }

    @Transactional
    public UserSettingsDto updateSettings(UUID userId, UserSettingsDto update) {
        UserSettings usersettings = this.settings.findById(userId).orElseGet(() -> new UserSettings(userId));
        usersettings.apply(update);
        return ((UserSettings)this.settings.save(usersettings)).toDto();
    }

    @Transactional(
        readOnly = true
    )
    public boolean isPrivateSession(UUID userId) {
        return this.settings.findById(userId).map(UserSettings::isPrivateSession).orElse(false);
    }
}
