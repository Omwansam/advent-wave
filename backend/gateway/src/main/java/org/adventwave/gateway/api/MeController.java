package org.adventwave.gateway.api;

import jakarta.validation.Valid;
import org.adventwave.contracts.api.UserDto;
import org.adventwave.contracts.api.UserSettingsDto;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.user.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1"})
public class MeController {
    private final UserService users;

    public MeController(UserService users) {
        this.users = users;
    }

    @GetMapping({"/me"})
    public UserDto me(AuthenticatedUser caller) {
        return this.users.toDto(this.users.require(caller.id()));
    }

    @GetMapping({"/settings"})
    public UserSettingsDto settings(AuthenticatedUser caller) {
        return this.users.getSettings(caller.id());
    }

    @PutMapping({"/settings"})
    public UserSettingsDto updateSettings(AuthenticatedUser caller, @Valid @RequestBody UserSettingsDto settings) {
        return this.users.updateSettings(caller.id(), settings);
    }
}
