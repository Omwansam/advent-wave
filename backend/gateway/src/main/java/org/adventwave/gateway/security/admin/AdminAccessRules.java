package org.adventwave.gateway.security.admin;

import static org.adventwave.gateway.security.admin.AdminPermissions.ADMINS_MANAGE;
import static org.adventwave.gateway.security.admin.AdminPermissions.ADMIN_SESSION;
import static org.adventwave.gateway.security.admin.AdminPermissions.CATALOG_READ;
import static org.adventwave.gateway.security.admin.AdminPermissions.LEGACY_CATALOG_WRITE;
import static org.adventwave.gateway.security.admin.AdminPermissions.MEDIA_PUBLISH;
import static org.adventwave.gateway.security.admin.AdminPermissions.MEDIA_WRITE;
import static org.adventwave.gateway.security.admin.AdminPermissions.RIGHTS_WRITE;

import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpMethod;
import org.springframework.util.AntPathMatcher;

/**
 * Which permission each admin endpoint needs — the one table both SecurityConfig (enforcement)
 * and OpenApiConfig (the documented scope per operation) read, so the two cannot disagree.
 * First match wins; the last rule catches every admin write not named above it, so a new
 * endpoint is protected by default and only ever loosened on purpose.
 */
public final class AdminAccessRules {
    /** @param method null for any method; @param permission {@link AdminPermissions#ADMIN_SESSION} for "any signed-in admin" */
    public record Rule(HttpMethod method, String pattern, String permission) {
        /** Authorities that satisfy the rule: the permission, and on catalogue rules the pre-RBAC scope. */
        public String[] authorities() {
            if (ADMIN_SESSION.equals(this.permission)) return new String[] {ADMIN_SESSION};
            if (ADMINS_MANAGE.equals(this.permission)) return new String[] {AdminPermissions.authority(ADMINS_MANAGE)};
            return new String[] {AdminPermissions.authority(this.permission), AdminPermissions.authority(LEGACY_CATALOG_WRITE)};
        }
    }

    public static final List<Rule> RULES = List.of(
        // The signed-in admin themself — open even before a forced password change.
        new Rule(HttpMethod.GET, "/v1/admin/me", ADMIN_SESSION),
        new Rule(HttpMethod.POST, "/v1/admin/me/password", ADMIN_SESSION),
        new Rule(HttpMethod.POST, "/v1/admin/me/sign-out", ADMIN_SESSION),
        // Staff accounts.
        new Rule(null, "/v1/admin/accounts", ADMINS_MANAGE),
        new Rule(null, "/v1/admin/accounts/**", ADMINS_MANAGE),
        // Rights: churches, consent, licences.
        new Rule(HttpMethod.POST, "/v1/admin/churches", RIGHTS_WRITE),
        new Rule(HttpMethod.PUT, "/v1/admin/churches/**", RIGHTS_WRITE),
        new Rule(HttpMethod.POST, "/v1/admin/licenses", RIGHTS_WRITE),
        new Rule(HttpMethod.PUT, "/v1/admin/licenses/**", RIGHTS_WRITE),
        // Going live.
        new Rule(HttpMethod.POST, "/v1/admin/media/*/publish", MEDIA_PUBLISH),
        new Rule(HttpMethod.POST, "/v1/admin/media/*/withdraw", MEDIA_PUBLISH),
        // Reading anything.
        new Rule(HttpMethod.GET, "/v1/admin/**", CATALOG_READ),
        // Every other admin write: artists, albums, media items, uploads, transcodes.
        new Rule(null, "/v1/admin/**", MEDIA_WRITE)
    );

    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private AdminAccessRules() {
    }

    /** The rule for a request path, or for an OpenAPI path template ({@code {id}} matches one segment). */
    public static Optional<Rule> match(HttpMethod method, String path) {
        String concrete = path.replaceAll("\\{[^}/]+}", "x");
        return RULES.stream()
            .filter(r -> r.method() == null || r.method().equals(method))
            .filter(r -> MATCHER.match(r.pattern(), concrete))
            .findFirst();
    }
}
