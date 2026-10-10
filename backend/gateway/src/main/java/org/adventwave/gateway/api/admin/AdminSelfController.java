package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import org.adventwave.contracts.api.admin.AdminAccountDto;
import org.adventwave.gateway.security.admin.AdminAccountService;
import org.adventwave.gateway.security.admin.AdminJwtAuthenticationConverter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in admin's own account. Open to every admin-portal session, including one that must
 * change its password before anything else.
 */
@RestController
@RequestMapping("/v1/admin/me")
public class AdminSelfController {
    private final AdminAccountService accounts;

    public AdminSelfController(AdminAccountService accounts) {
        this.accounts = accounts;
    }

    /** Who is signed in, their role, and the permissions it holds now. */
    @GetMapping
    public AdminAccountDto me(Authentication authentication) {
        return this.accounts.me(AdminJwtAuthenticationConverter.currentAccountId(authentication));
    }

    /** Ends every session of this account, this one included, and returns a new one. */
    @PostMapping("/password")
    public AdminAccountDto.AdminSession changePassword(Authentication authentication, @Valid @RequestBody AdminAccountDto.PasswordChangeRequest request) {
        return this.accounts.changeOwnPassword(AdminJwtAuthenticationConverter.currentAccountId(authentication), request);
    }

    /** Ends every session of this account, on every device. */
    @PostMapping("/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signOut(Authentication authentication) {
        this.accounts.signOutEverywhere(AdminJwtAuthenticationConverter.currentAccountId(authentication));
    }
}
