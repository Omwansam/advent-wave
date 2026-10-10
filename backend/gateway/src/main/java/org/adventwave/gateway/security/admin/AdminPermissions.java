package org.adventwave.gateway.security.admin;

/**
 * The permissions of the admin surface (RFC 0001). On a request they are authorities named
 * {@code SCOPE_<permission>}, the shape Spring gives an OAuth {@code scope} claim, so an external
 * IdP that issues these scopes needs no code change. Which endpoint needs which is
 * {@link AdminAccessRules}; which role holds which is {@link AdminRole}.
 */
public final class AdminPermissions {
    /** Read anything on /v1/admin. */
    public static final String CATALOG_READ = "catalog:read";
    /** Artists, albums, media items: create, edit, upload a master, request a transcode. */
    public static final String MEDIA_WRITE = "media:write";
    /** Publish and withdraw. Separate from editing: going live is its own decision. */
    public static final String MEDIA_PUBLISH = "media:publish";
    /** Churches, their consent, licences and licence status — the rights that gate publication. */
    public static final String RIGHTS_WRITE = "rights:write";
    /** Staff accounts: create, change role, disable, reset a password. */
    public static final String ADMINS_MANAGE = "admins:manage";

    /**
     * The scope the admin surface required before RBAC (contracts 1.2.0). Still honoured on every
     * catalogue rule, so a token from an IdP that issues it keeps working; never granted by a
     * role here. It does not include {@link #ADMINS_MANAGE}, which did not exist then.
     */
    public static final String LEGACY_CATALOG_WRITE = "catalog:write";

    /** Every authenticated admin-portal session, whatever its role — including one that must change its password first. */
    public static final String ADMIN_SESSION = "ADMIN_SESSION";

    private AdminPermissions() {
    }

    public static String authority(String permission) {
        return "SCOPE_" + permission;
    }
}
