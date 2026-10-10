package org.adventwave.gateway.security.admin;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Turns a verified JWT into the request's authorities.
 *
 * <p>An admin-portal token ({@code iss = adventwave-admin}) is only a pointer: the account it
 * names is loaded on every request, and the request gets the permissions of that account's
 * <em>current</em> role. A disabled account, a deleted one, or a token from before the last
 * sign-out, password change, reset or role change ({@code ver} behind {@code token_version}) is
 * refused with 401. An account that must change its password gets {@code ADMIN_SESSION} alone,
 * which opens /v1/admin/me and the password change and nothing else.
 *
 * <p>Any other token — the listener dev issuer, an external IdP — gets Spring's default
 * treatment: {@code scope} → {@code SCOPE_*}. That keeps a {@code catalog:write} token from an IdP
 * working on the catalogue rules exactly as before RBAC.
 */
@Component
public class AdminJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final JwtAuthenticationConverter scopes = new JwtAuthenticationConverter();
    private final AdminAccountRepository accounts;

    public AdminJwtAuthenticationConverter(AdminAccountRepository accounts) {
        this.accounts = accounts;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        if (!AdminTokenService.ISSUER.equals(jwt.getClaimAsString("iss"))) {
            return this.scopes.convert(jwt);
        }
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (Exception e) {
            throw new InvalidBearerTokenException("malformed admin token");
        }
        AdminAccount account = this.accounts.findById(id)
            .orElseThrow(() -> new InvalidBearerTokenException("this admin account no longer exists"));
        if (!account.isActive()) {
            throw new InvalidBearerTokenException("this admin account is disabled");
        }
        Object version = jwt.getClaim(AdminTokenService.VERSION_CLAIM);
        if (!(version instanceof Number n) || n.intValue() != account.getTokenVersion()) {
            throw new InvalidBearerTokenException("this session has ended; sign in again");
        }
        // A sign-in lock is not checked here: it is caused by someone else's wrong guesses, and
        // must not end the sessions the owner already has.

        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(AdminPermissions.ADMIN_SESSION));
        if (!account.isMustChangePassword()) {
            account.adminRole().permissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(AdminPermissions.authority(p))));
        }
        return new JwtAuthenticationToken(jwt, authorities, account.getId().toString());
    }

    /** The signed-in admin account's id, from a request this converter authenticated. */
    public static UUID currentAccountId(org.springframework.security.core.Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken token
            && AdminTokenService.ISSUER.equals(token.getToken().getClaimAsString("iss"))) {
            return UUID.fromString(token.getName());
        }
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "this needs an admin-portal session; sign in at POST /v1/auth/admin/login");
    }
}
