package org.adventwave.gateway.security.admin;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.adventwave.contracts.api.admin.AdminAccountDto;
import org.adventwave.gateway.admin.AdminConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Staff accounts and their sign-in (RFC 0001). Every rule about who may sign in, and what a
 * password must be, lives here; the per-request check lives in AdminJwtAuthenticationConverter.
 *
 * <p>Sign-in never says which half was wrong, and costs the same with or without an account, so
 * it cannot be used to discover which emails are staff. The one exception is a lock, which is
 * reported only for an account that exists — after enough wrong guesses to trigger it.
 */
@Service
@Transactional
public class AdminAccountService {
    private static final Logger log = LoggerFactory.getLogger(AdminAccountService.class);
    private static final String BAD_CREDENTIALS = "email or password is incorrect";
    /** bcrypt reads only the first 72 bytes; a longer password would be silently truncated. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final AdminAccountRepository accounts;
    private final AdminTokenService tokens;
    private final AdminAuthProperties properties;
    private final PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    /** Compared against when the email is unknown, so a miss takes as long as a wrong password. */
    private final String decoyHash = this.encoder.encode(UUID.randomUUID().toString());

    public AdminAccountService(AdminAccountRepository accounts, AdminTokenService tokens, AdminAuthProperties properties) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.properties = properties;
    }

    // ----------------------------------------------------------------- sign-in

    /**
     * @throws ResponseStatusException 401 for a wrong email or password, 403 for a disabled
     *                                 account (after the password proved right), 429 while locked
     */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public AdminAccountDto.AdminSession login(AdminAccountDto.AdminLoginRequest r) {
        String email = normalise(r.email());
        String password = r.password();
        AdminAccount account = this.accounts.findByEmail(email).orElse(null);
        Instant now = Instant.now();

        if (account == null) {
            this.encoder.matches(fitForBcrypt(password), this.decoyHash);
            log.info("admin sign-in refused: unknown email");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        if (account.isLocked(now)) {
            log.warn("admin sign-in refused: account {} is locked until {}", account.getId(), account.getLockedUntil());
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "too many failed sign-ins; this account is locked until " + account.getLockedUntil());
        }
        boolean matches = password.getBytes(StandardCharsets.UTF_8).length <= MAX_PASSWORD_BYTES
            && this.encoder.matches(password, account.getPasswordHash());
        if (!matches) {
            int failures = account.getFailedLogins() + 1;
            if (failures >= this.properties.getMaxFailedLogins()) {
                account.setFailedLogins(0);
                account.setLockedUntil(now.plus(this.properties.getLockout()));
                log.warn("admin sign-in: account {} locked for {} after {} failures", account.getId(), this.properties.getLockout(), failures);
            } else {
                account.setFailedLogins(failures);
            }
            this.accounts.save(account);
            log.info("admin sign-in refused: wrong password for account {}", account.getId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        if (!account.isActive()) {
            log.info("admin sign-in refused: account {} is disabled", account.getId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "this account is disabled; ask a super admin to enable it");
        }
        account.setFailedLogins(0);
        account.setLockedUntil(null);
        account.setLastLoginAt(now);
        if (this.encoder.upgradeEncoding(account.getPasswordHash())) {
            account.setPasswordHash(this.encoder.encode(password));
        }
        this.accounts.save(account);
        log.info("admin sign-in: account {} ({})", account.getId(), account.getRole());
        return this.session(account);
    }

    // ----------------------------------------------------------------- the signed-in admin

    @Transactional(readOnly = true)
    public AdminAccountDto me(UUID accountId) {
        return toDto(this.require(accountId));
    }

    /** Replaces the password, ends every session (this one included), and returns a fresh one. */
    public AdminAccountDto.AdminSession changeOwnPassword(UUID accountId, AdminAccountDto.PasswordChangeRequest r) {
        AdminAccount account = this.require(accountId);
        boolean current = r.currentPassword().getBytes(StandardCharsets.UTF_8).length <= MAX_PASSWORD_BYTES
            && this.encoder.matches(r.currentPassword(), account.getPasswordHash());
        if (!current) {
            throw new IllegalArgumentException("the current password is incorrect");
        }
        if (r.newPassword().equals(r.currentPassword())) {
            throw new IllegalArgumentException("the new password must differ from the current one");
        }
        this.checkPolicy(r.newPassword(), account.getEmail());
        account.setPasswordHash(this.encoder.encode(r.newPassword()));
        account.setPasswordChangedAt(Instant.now());
        account.setMustChangePassword(false);
        account.revokeSessions();
        this.touch(account);
        log.info("admin account {} changed its password; earlier sessions ended", account.getId());
        return this.session(account);
    }

    /** Ends every session of this account, on every device. */
    public void signOutEverywhere(UUID accountId) {
        AdminAccount account = this.require(accountId);
        account.revokeSessions();
        this.touch(account);
        log.info("admin account {} signed out everywhere", account.getId());
    }

    // ----------------------------------------------------------------- managing accounts

    @Transactional(readOnly = true)
    public List<AdminAccountDto> list() {
        return this.accounts.findAllByOrderByDisplayNameAsc().stream().map(AdminAccountService::toDto).toList();
    }

    public AdminAccountDto create(UUID actorId, AdminAccountDto.AccountCreateRequest r) {
        String email = normalise(r.email());
        AdminRole role = AdminRole.fromWire(r.role());
        this.checkPolicy(r.temporaryPassword(), email);
        if (this.accounts.findByEmail(email).isPresent()) {
            throw new AdminConflictException("an admin account with that email already exists");
        }
        AdminAccount account = new AdminAccount(email, r.displayName().trim(), this.encoder.encode(r.temporaryPassword()), role, true);
        try {
            account = this.accounts.saveAndFlush(account);
        } catch (DataIntegrityViolationException e) {
            throw new AdminConflictException("an admin account with that email already exists");
        }
        log.info("admin account {} ({}) created by {}", account.getId(), role.wireValue(), actorId);
        return toDto(account);
    }

    /**
     * Name, role, active. A role change or a deactivation ends the account's sessions. Two
     * guards: nobody changes their own role or disables themself (a slip would lock them out),
     * and the last active super admin cannot be demoted or disabled.
     */
    public AdminAccountDto update(UUID actorId, UUID accountId, AdminAccountDto.AccountUpdateRequest r) {
        AdminAccount account = this.require(accountId);
        AdminRole newRole = r.role() == null ? account.adminRole() : AdminRole.fromWire(r.role());
        boolean newActive = r.active() == null ? account.isActive() : r.active();
        boolean roleChanges = newRole != account.adminRole();
        boolean activeChanges = newActive != account.isActive();

        if (accountId.equals(actorId) && (roleChanges || (activeChanges && !newActive))) {
            throw new AdminConflictException("you cannot change your own role or disable your own account; ask another super admin");
        }
        boolean losesSuperAdmin = account.adminRole() == AdminRole.SUPER_ADMIN && account.isActive()
            && (newRole != AdminRole.SUPER_ADMIN || !newActive);
        if (losesSuperAdmin && this.accounts.countByRoleAndActiveTrue(AdminRole.SUPER_ADMIN.wireValue()) <= 1) {
            throw new AdminConflictException("this is the last active super admin; make another one first");
        }

        if (r.displayName() != null && !r.displayName().isBlank()) account.setDisplayName(r.displayName().trim());
        if (roleChanges) account.setRole(newRole);
        if (activeChanges) account.setActive(newActive);
        if (roleChanges || activeChanges) account.revokeSessions();
        this.touch(account);
        log.info("admin account {} updated by {} (role {}, active {})", accountId, actorId, newRole.wireValue(), newActive);
        return toDto(account);
    }

    /** Sets a temporary password, unlocks, ends the account's sessions; the owner must change it at next sign-in. */
    public AdminAccountDto resetPassword(UUID actorId, UUID accountId, AdminAccountDto.PasswordResetRequest r) {
        AdminAccount account = this.require(accountId);
        this.checkPolicy(r.temporaryPassword(), account.getEmail());
        account.setPasswordHash(this.encoder.encode(r.temporaryPassword()));
        account.setPasswordChangedAt(Instant.now());
        account.setMustChangePassword(true);
        account.setFailedLogins(0);
        account.setLockedUntil(null);
        account.revokeSessions();
        this.touch(account);
        log.info("admin account {} had its password reset by {}", accountId, actorId);
        return toDto(account);
    }

    // ----------------------------------------------------------------- first account

    /** Creates the first super admin from configuration, once, when no admin account exists. */
    @EventListener(ApplicationReadyEvent.class)
    public void bootstrap() {
        if (this.accounts.count() > 0) return;
        String email = this.properties.getBootstrapEmail();
        String password = this.properties.getBootstrapPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("no admin account exists: set adventwave.auth.admin.bootstrap-email and bootstrap-password "
                + "(ADVENTWAVE_ADMIN_BOOTSTRAP_EMAIL / _PASSWORD) to create the first super admin");
            return;
        }
        try {
            this.checkPolicy(password, normalise(email));
        } catch (IllegalArgumentException e) {
            log.warn("the bootstrap admin was not created: its password is too weak ({})", e.getMessage());
            return;
        }
        AdminAccount account = new AdminAccount(normalise(email), this.properties.getBootstrapName(),
            this.encoder.encode(password), AdminRole.SUPER_ADMIN, false);
        this.accounts.save(account);
        log.info("created the first super admin, {}, from adventwave.auth.admin.bootstrap-*", account.getEmail());
    }

    // ----------------------------------------------------------------- helpers

    private AdminAccountDto.AdminSession session(AdminAccount account) {
        return new AdminAccountDto.AdminSession(this.tokens.mint(account), "Bearer", this.tokens.ttlSeconds(), toDto(account));
    }

    private void checkPolicy(String password, String email) {
        if (password.codePointCount(0, password.length()) < this.properties.getMinPasswordLength()) {
            throw new IllegalArgumentException("a password needs at least " + this.properties.getMinPasswordLength() + " characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new IllegalArgumentException("a password can be at most " + MAX_PASSWORD_BYTES + " bytes");
        }
        if (password.isBlank() || password.equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("choose a password that is not your email address");
        }
    }

    private AdminAccount require(UUID id) {
        return this.accounts.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "admin account " + id + " not found"));
    }

    private void touch(AdminAccount account) {
        account.setUpdatedAt(Instant.now());
        this.accounts.save(account);
    }

    private static String fitForBcrypt(String password) {
        byte[] bytes = password.getBytes(StandardCharsets.UTF_8);
        return bytes.length <= MAX_PASSWORD_BYTES ? password : new String(bytes, 0, MAX_PASSWORD_BYTES, StandardCharsets.UTF_8);
    }

    static String normalise(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    static AdminAccountDto toDto(AdminAccount a) {
        AdminRole role = a.adminRole();
        Instant now = Instant.now();
        return new AdminAccountDto(
            a.getId().toString(), a.getEmail(), a.getDisplayName(), role.wireValue(), role.permissions(),
            a.isActive(), a.isMustChangePassword(),
            a.getLastLoginAt() == null ? null : a.getLastLoginAt().toString(),
            a.isLocked(now) ? a.getLockedUntil().toString() : null,
            a.getCreatedAt().toString());
    }
}
