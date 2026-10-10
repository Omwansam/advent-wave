package org.adventwave.contracts.api.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * A staff account of the admin portal (RFC 0001), as the portal sees it. Never carries the
 * password hash. {@code permissions} is what {@code role} grants right now; the gateway decides
 * from the stored role on every request, so this is for display, not a capability.
 *
 * @param role        super_admin | content_manager | rights_manager | viewer
 * @param permissions catalog:read, media:write, media:publish, rights:write, admins:manage — the role's set
 */
@JsonInclude(Include.NON_NULL)
public record AdminAccountDto(
    String id,
    String email,
    String displayName,
    String role,
    List<String> permissions,
    boolean active,
    boolean mustChangePassword,
    String lastLoginAt,
    String lockedUntil,
    String createdAt
) {
    public static final String ROLE_PATTERN = "super_admin|content_manager|rights_manager|viewer";

    /** POST /v1/auth/admin/login. */
    public record AdminLoginRequest(@NotBlank @Email String email, @NotBlank @Size(max = 200) String password) {
    }

    /** A signed-in admin: the bearer token for /v1/admin/**, and who it belongs to. */
    public record AdminSession(String token, String tokenType, long expiresIn, @Valid AdminAccountDto account) {
    }

    /** POST /v1/admin/me/password. Ends every other session and returns a new one. */
    public record PasswordChangeRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {
    }

    /** POST /v1/admin/accounts. The owner must replace the temporary password at first sign-in. */
    public record AccountCreateRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Pattern(regexp = ROLE_PATTERN) String role,
        @NotBlank String temporaryPassword
    ) {
    }

    /** PATCH /v1/admin/accounts/{id}. Omitted fields are unchanged. A role or active change ends the account's sessions. */
    public record AccountUpdateRequest(@Size(min = 1, max = 120) String displayName, @Pattern(regexp = ROLE_PATTERN) String role, Boolean active) {
    }

    /** POST /v1/admin/accounts/{id}/password. Unlocks the account, ends its sessions, and requires a change at next sign-in. */
    public record PasswordResetRequest(@NotBlank String temporaryPassword) {
    }
}
