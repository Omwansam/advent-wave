package org.adventwave.gateway.security.admin;

import static org.adventwave.gateway.security.admin.AdminPermissions.ADMINS_MANAGE;
import static org.adventwave.gateway.security.admin.AdminPermissions.CATALOG_READ;
import static org.adventwave.gateway.security.admin.AdminPermissions.MEDIA_PUBLISH;
import static org.adventwave.gateway.security.admin.AdminPermissions.MEDIA_WRITE;
import static org.adventwave.gateway.security.admin.AdminPermissions.RIGHTS_WRITE;

import java.util.Arrays;
import java.util.List;

/**
 * Roles of the admin portal and the permissions each holds (RFC 0001). The mapping is code, not
 * data: it changes with the endpoints it guards, in review, never from the portal itself.
 * {@code admin_accounts.role} CHECKs the same four values.
 */
public enum AdminRole {
    /** Runs everything, including the staff accounts. */
    SUPER_ADMIN("super_admin", List.of(CATALOG_READ, MEDIA_WRITE, MEDIA_PUBLISH, RIGHTS_WRITE, ADMINS_MANAGE)),
    /** Adds and edits recordings, artists and albums, and decides what goes live. */
    CONTENT_MANAGER("content_manager", List.of(CATALOG_READ, MEDIA_WRITE, MEDIA_PUBLISH)),
    /** Churches, consent and licences: the rights side that gates publication. */
    RIGHTS_MANAGER("rights_manager", List.of(CATALOG_READ, RIGHTS_WRITE)),
    /** Sees everything, changes nothing. */
    VIEWER("viewer", List.of(CATALOG_READ));

    private final String wireValue;
    private final List<String> permissions;

    AdminRole(String wireValue, List<String> permissions) {
        this.wireValue = wireValue;
        this.permissions = permissions;
    }

    public String wireValue() {
        return this.wireValue;
    }

    public List<String> permissions() {
        return this.permissions;
    }

    public static AdminRole fromWire(String value) {
        return Arrays.stream(values())
            .filter(r -> r.wireValue.equals(value))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("unknown role: " + value));
    }
}
