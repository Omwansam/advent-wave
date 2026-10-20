package org.adventwave.gateway.security.listener;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.adventwave.contracts.api.ListenerEmailVerification;
import org.adventwave.contracts.api.ListenerLoginRequest;
import org.adventwave.contracts.api.ListenerPasswordChange;
import org.adventwave.contracts.api.ListenerPasswordResetConfirm;
import org.adventwave.contracts.api.ListenerPasswordResetRequest;
import org.adventwave.contracts.api.ListenerRegisterRequest;
import org.adventwave.contracts.api.ListenerSessionDto;
import org.adventwave.contracts.api.UserDto;
import org.adventwave.platform.domain.ListenerCredential;
import org.adventwave.platform.domain.ListenerToken;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.repo.PlatformRepositories;
import org.adventwave.platform.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Listener accounts (RFC 0005): sign-up, sign-in, the emailed links, and the signed-in owner's
 * password and sessions. Every rule about who may sign in and what a password must be lives here.
 *
 * <p>Sign-in never says which half was wrong and costs the same with or without an account; a
 * reset request is answered the same either way. Registration does say an email is taken — a
 * sign-up form that pretends otherwise only confuses the person who already has an account.
 *
 * <p>An existing users row with no password (a seeded demo account, anyone the dev issuer or an
 * IdP provisioned) cannot be claimed by registering its email. Its owner sets a password through
 * the reset link, which proves the mailbox is theirs first.
 */
@Service
@Transactional
public class ListenerAccountService {
    private static final Logger log = LoggerFactory.getLogger(ListenerAccountService.class);
    private static final String BAD_CREDENTIALS = "email or password is incorrect";
    /** bcrypt reads only the first 72 bytes; a longer password would be silently truncated. */
    private static final int MAX_PASSWORD_BYTES = 72;
    /** The external_auth_id prefix of accounts made here, as an IdP's `sub` would be its own. */
    public static final String SUBJECT_PREFIX = "adventwave|";
    /** The handful every breach list starts with. Length rules alone let all of these through. */
    private static final Set<String> COMMON = Set.of(
        "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwertyui",
        "qwerty123", "11111111", "00000000", "iloveyou", "abc12345", "letmein1", "sunshine",
        "princess", "welcome1", "football", "baseball", "adventwave", "jesus123", "godislove");

    private final PlatformRepositories.UserAccountRepository users;
    private final PlatformRepositories.ListenerCredentialRepository credentials;
    private final PlatformRepositories.ListenerTokenRepository tokens;
    private final UserService userService;
    private final ListenerTokenService sessions;
    private final ListenerAuthProperties properties;
    private final ListenerMailer mailer;
    private final PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    /** Compared against when the email has no password, so a miss takes as long as a wrong password. */
    private final String decoyHash = this.encoder.encode(UUID.randomUUID().toString());
    private final SecureRandom random = new SecureRandom();

    public ListenerAccountService(
        PlatformRepositories.UserAccountRepository users,
        PlatformRepositories.ListenerCredentialRepository credentials,
        PlatformRepositories.ListenerTokenRepository tokens,
        UserService userService,
        ListenerTokenService sessions,
        ListenerAuthProperties properties,
        ListenerMailer mailer
    ) {
        this.users = users;
        this.credentials = credentials;
        this.tokens = tokens;
        this.userService = userService;
        this.sessions = sessions;
        this.properties = properties;
        this.mailer = mailer;
    }

    // ----------------------------------------------------------------- sign-up and sign-in

    public ListenerSessionDto register(ListenerRegisterRequest r) {
        String email = normalise(r.email());
        if (this.users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "an account with this email already exists; sign in, or reset the password if you have not set one");
        }
        this.checkPolicy(r.password(), email);
        String name = r.name() == null || r.name().isBlank() ? email.split("@")[0] : r.name().trim();
        UserAccount user;
        try {
            user = this.userService.provision(SUBJECT_PREFIX + UUID.randomUUID(), email, name, null);
            this.users.flush();
        } catch (DataIntegrityViolationException e) {
            // Two sign-ups for one email at once: the unique index decided, and this one lost.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "an account with this email already exists; sign in instead");
        }
        ListenerCredential credential = this.credentials.save(new ListenerCredential(user.getId(), this.encoder.encode(r.password())));
        this.sendVerification(user, Instant.now());
        log.info("listener account {} registered", user.getId());
        return this.session(user, credential);
    }

    /**
     * @throws ResponseStatusException 401 for a wrong email or password (or an account with no
     *                                 password), 429 while the account is locked
     */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public ListenerSessionDto login(ListenerLoginRequest r) {
        String email = normalise(r.email());
        String password = r.password();
        UserAccount user = this.users.findByEmail(email).orElse(null);
        ListenerCredential credential = user == null ? null : this.credentials.findById(user.getId()).orElse(null);
        Instant now = Instant.now();

        if (credential == null) {
            this.encoder.matches(fitForBcrypt(password), this.decoyHash);
            log.info("listener sign-in refused: no password for that email");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        if (credential.isLocked(now)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "too many failed sign-ins; try again after " + credential.getLockedUntil() + ", or reset your password");
        }
        boolean matches = password.getBytes(StandardCharsets.UTF_8).length <= MAX_PASSWORD_BYTES
            && this.encoder.matches(password, credential.getPasswordHash());
        if (!matches) {
            int failures = credential.getFailedLogins() + 1;
            if (failures >= this.properties.getMaxFailedLogins()) {
                credential.setFailedLogins(0);
                credential.setLockedUntil(now.plus(this.properties.getLockout()));
                log.warn("listener sign-in: account {} locked for {} after {} failures", user.getId(), this.properties.getLockout(), failures);
            } else {
                credential.setFailedLogins(failures);
            }
            this.touch(credential, now);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        credential.setFailedLogins(0);
        credential.setLockedUntil(null);
        credential.setLastLoginAt(now);
        if (this.encoder.upgradeEncoding(credential.getPasswordHash())) {
            credential.setPasswordHash(this.encoder.encode(password));
        }
        this.touch(credential, now);
        return this.session(user, credential);
    }

    // ----------------------------------------------------------------- the emailed links

    /** Sends a reset link if the email belongs to an account; answers the same either way. */
    public void requestPasswordReset(ListenerPasswordResetRequest r) {
        UserAccount user = this.users.findByEmail(normalise(r.email())).orElse(null);
        if (user == null) {
            log.info("password reset asked for an email with no account");
            return;
        }
        Instant now = Instant.now();
        if (!this.underEmailQuota(user.getId(), ListenerToken.PASSWORD_RESET, now)) {
            log.info("password reset for account {} not sent: hourly limit reached", user.getId());
            return;
        }
        String token = this.issue(user.getId(), ListenerToken.PASSWORD_RESET, now.plus(this.properties.getPasswordResetTtl()));
        long minutes = this.properties.getPasswordResetTtl().toMinutes();
        this.mailer.send(user.getEmail(), "Reset your AdventWave password", """
            Hello %s,

            Someone asked to reset the password for your AdventWave account. If it was you, open \
            this link within %d minutes and choose a new one:

            %s

            If it wasn't you, ignore this email. Your password stays as it is.

            AdventWave
            """.formatted(user.getDisplayName(), minutes, this.link("/reset-password", token)));
    }

    /**
     * Sets a new password from an emailed link and signs in. Ends every other session, and counts
     * as verifying the email: whoever followed the link reads that mailbox. Also how an account
     * that never had a password gets one.
     */
    public ListenerSessionDto confirmPasswordReset(ListenerPasswordResetConfirm r) {
        Instant now = Instant.now();
        ListenerToken token = this.usable(r.token(), ListenerToken.PASSWORD_RESET, now,
            "this reset link has expired or has been used; ask for a new one");
        UserAccount user = this.users.findById(token.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("this reset link has expired or has been used; ask for a new one"));
        this.checkPolicy(r.newPassword(), user.getEmail());

        ListenerCredential credential = this.credentials.findById(user.getId())
            .orElseGet(() -> new ListenerCredential(user.getId(), ""));
        credential.setPasswordHash(this.encoder.encode(r.newPassword()));
        credential.setPasswordChangedAt(now);
        credential.setFailedLogins(0);
        credential.setLockedUntil(null);
        credential.setLastLoginAt(now);
        if (credential.getEmailVerifiedAt() == null) credential.setEmailVerifiedAt(now);
        credential.revokeSessions();
        this.touch(credential, now);
        this.tokens.spendAll(user.getId(), ListenerToken.PASSWORD_RESET, now);
        log.info("listener account {} set a new password from a reset link; earlier sessions ended", user.getId());
        return this.session(user, credential);
    }

    public UserDto verifyEmail(ListenerEmailVerification r) {
        Instant now = Instant.now();
        ListenerToken token = this.usable(r.token(), ListenerToken.EMAIL_VERIFICATION, now,
            "this verification link has expired or has been used; sign in and ask for a new one");
        ListenerCredential credential = this.credentials.findById(token.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("this verification link has expired or has been used"));
        if (credential.getEmailVerifiedAt() == null) credential.setEmailVerifiedAt(now);
        this.touch(credential, now);
        this.tokens.spendAll(token.getUserId(), ListenerToken.EMAIL_VERIFICATION, now);
        UserAccount user = this.users.findById(token.getUserId()).orElseThrow();
        return this.userService.toDto(user);
    }

    // ----------------------------------------------------------------- the signed-in listener

    /** Sends another verification link, unless the email is verified or the hourly limit is reached. */
    public void resendVerification(UUID userId) {
        ListenerCredential credential = this.requireCredential(userId);
        if (credential.getEmailVerifiedAt() != null) return;
        this.users.findById(userId).ifPresent(user -> this.sendVerification(user, Instant.now()));
    }

    /** Replaces the password, ends every session (this one included), and returns a fresh one. */
    public ListenerSessionDto changePassword(UUID userId, ListenerPasswordChange r) {
        ListenerCredential credential = this.requireCredential(userId);
        UserAccount user = this.users.findById(userId).orElseThrow();
        boolean current = r.currentPassword().getBytes(StandardCharsets.UTF_8).length <= MAX_PASSWORD_BYTES
            && this.encoder.matches(r.currentPassword(), credential.getPasswordHash());
        if (!current) throw new IllegalArgumentException("the current password is incorrect");
        if (r.newPassword().equals(r.currentPassword())) throw new IllegalArgumentException("the new password must differ from the current one");
        this.checkPolicy(r.newPassword(), user.getEmail());
        Instant now = Instant.now();
        credential.setPasswordHash(this.encoder.encode(r.newPassword()));
        credential.setPasswordChangedAt(now);
        credential.revokeSessions();
        this.touch(credential, now);
        log.info("listener account {} changed its password; earlier sessions ended", userId);
        return this.session(user, credential);
    }

    /** Ends every session of this account, on every device. */
    public void signOutEverywhere(UUID userId) {
        ListenerCredential credential = this.requireCredential(userId);
        credential.revokeSessions();
        this.touch(credential, Instant.now());
        log.info("listener account {} signed out everywhere", userId);
    }

    // ----------------------------------------------------------------- helpers

    private void sendVerification(UserAccount user, Instant now) {
        if (!this.underEmailQuota(user.getId(), ListenerToken.EMAIL_VERIFICATION, now)) return;
        String token = this.issue(user.getId(), ListenerToken.EMAIL_VERIFICATION, now.plus(this.properties.getEmailVerificationTtl()));
        this.mailer.send(user.getEmail(), "Confirm your email for AdventWave", """
            Welcome to AdventWave, %s.

            Confirm that this is your email address, so you can always get back into your \
            account:

            %s

            The link works for %d days. If you did not create an account, ignore this email.

            AdventWave
            """.formatted(user.getDisplayName(), this.link("/verify-email", token), this.properties.getEmailVerificationTtl().toDays()));
    }

    private boolean underEmailQuota(UUID userId, String purpose, Instant now) {
        return this.tokens.findByUserIdAndPurposeAndCreatedAtAfterOrderByCreatedAtDesc(userId, purpose, now.minusSeconds(3600)).size()
            < this.properties.getMaxEmailsPerHour();
    }

    /** A fresh random token; only its hash is stored. */
    private String issue(UUID userId, String purpose, Instant expiresAt) {
        byte[] bytes = new byte[32];
        this.random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        this.tokens.save(new ListenerToken(sha256(token), userId, purpose, expiresAt));
        return token;
    }

    private ListenerToken usable(String token, String purpose, Instant now, String refusal) {
        return this.tokens.findById(sha256(token.trim()))
            .filter(t -> t.isUsable(purpose, now))
            .orElseThrow(() -> new IllegalArgumentException(refusal));
    }

    private String link(String path, String token) {
        String base = this.properties.getAppBaseUrl().replaceAll("/+$", "");
        return base + path + "?token=" + token;
    }

    private ListenerSessionDto session(UserAccount user, ListenerCredential credential) {
        return new ListenerSessionDto(this.sessions.mint(user, credential), "Bearer", this.sessions.ttlSeconds(), this.userService.toDto(user));
    }

    private ListenerCredential requireCredential(UUID userId) {
        return this.credentials.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
            "this account signs in without an AdventWave password; use the password-reset link to set one"));
    }

    private void touch(ListenerCredential credential, Instant now) {
        credential.setUpdatedAt(now);
        this.credentials.save(credential);
    }

    private void checkPolicy(String password, String email) {
        if (password.codePointCount(0, password.length()) < this.properties.getMinPasswordLength()) {
            throw new IllegalArgumentException("a password needs at least " + this.properties.getMinPasswordLength() + " characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new IllegalArgumentException("a password can be at most " + MAX_PASSWORD_BYTES + " bytes");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (password.isBlank() || lower.equals(email) || lower.equals(email.split("@")[0]) || COMMON.contains(lower)) {
            throw new IllegalArgumentException("that password is too easy to guess; choose another");
        }
    }

    private static String fitForBcrypt(String password) {
        byte[] bytes = password.getBytes(StandardCharsets.UTF_8);
        return bytes.length <= MAX_PASSWORD_BYTES ? password : new String(bytes, 0, MAX_PASSWORD_BYTES, StandardCharsets.UTF_8);
    }

    static String normalise(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
