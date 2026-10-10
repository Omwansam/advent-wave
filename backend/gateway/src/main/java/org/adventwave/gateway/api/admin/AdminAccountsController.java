package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.adventwave.contracts.api.admin.AdminAccountDto;
import org.adventwave.gateway.security.admin.AdminAccountService;
import org.adventwave.gateway.security.admin.AdminJwtAuthenticationConverter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Staff accounts of the admin portal. Requires the {@code admins:manage} permission (super admins). */
@RestController
@RequestMapping("/v1/admin/accounts")
public class AdminAccountsController {
    private final AdminAccountService accounts;

    public AdminAccountsController(AdminAccountService accounts) {
        this.accounts = accounts;
    }

    @GetMapping
    public List<AdminAccountDto> list() {
        return this.accounts.list();
    }

    /** Creates an account with a temporary password the owner must replace at first sign-in. 409 if the email is taken. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminAccountDto create(Authentication authentication, @Valid @RequestBody AdminAccountDto.AccountCreateRequest request) {
        return this.accounts.create(AdminJwtAuthenticationConverter.currentAccountId(authentication), request);
    }

    /**
     * Name, role, active. A role change or a deactivation ends that account's sessions. 409 for
     * your own role or deactivation, or for leaving no active super admin.
     */
    @PatchMapping("/{id}")
    public AdminAccountDto update(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody AdminAccountDto.AccountUpdateRequest request) {
        return this.accounts.update(AdminJwtAuthenticationConverter.currentAccountId(authentication), id, request);
    }

    /** Sets a temporary password, unlocks the account and ends its sessions. */
    @PostMapping("/{id}/password")
    public AdminAccountDto resetPassword(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody AdminAccountDto.PasswordResetRequest request) {
        return this.accounts.resetPassword(AdminJwtAuthenticationConverter.currentAccountId(authentication), id, request);
    }
}
