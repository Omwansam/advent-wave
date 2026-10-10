package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import org.adventwave.contracts.api.admin.AdminAccountDto;
import org.adventwave.gateway.security.admin.AdminAccountService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-portal sign-in (RFC 0001): an email and a password for a token that opens /v1/admin/**
 * as far as the account's role allows. Wrong credentials are 401 without saying which half was
 * wrong; repeated failures lock the account for a while (429).
 */
@RestController
@RequestMapping("/v1/auth/admin")
public class AdminAuthController {
    private final AdminAccountService accounts;

    public AdminAuthController(AdminAccountService accounts) {
        this.accounts = accounts;
    }

    @PostMapping("/login")
    public AdminAccountDto.AdminSession login(@Valid @RequestBody AdminAccountDto.AdminLoginRequest request) {
        return this.accounts.login(request);
    }
}
