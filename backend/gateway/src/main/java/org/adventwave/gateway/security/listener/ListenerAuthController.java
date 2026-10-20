package org.adventwave.gateway.security.listener;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import org.adventwave.contracts.api.ListenerEmailVerification;
import org.adventwave.contracts.api.ListenerLoginRequest;
import org.adventwave.contracts.api.ListenerPasswordChange;
import org.adventwave.contracts.api.ListenerPasswordResetConfirm;
import org.adventwave.contracts.api.ListenerPasswordResetRequest;
import org.adventwave.contracts.api.ListenerRegisterRequest;
import org.adventwave.contracts.api.ListenerSessionDto;
import org.adventwave.contracts.api.UserDto;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Listener accounts on the public surface (RFC 0005). The /v1/auth operations are open, limited
 * per client address; the /v1/me ones act on the signed-in listener's own account.
 */
@RestController
@RequestMapping("/v1")
public class ListenerAuthController {
    private final ListenerAccountService accounts;
    private final AuthRateLimiter limiter;

    public ListenerAuthController(ListenerAccountService accounts, AuthRateLimiter limiter) {
        this.accounts = accounts;
        this.limiter = limiter;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ListenerSessionDto register(@Valid @RequestBody ListenerRegisterRequest request, HttpServletRequest http) {
        this.limit("register", http, 10, Duration.ofHours(1));
        return this.accounts.register(request);
    }

    @PostMapping("/auth/login")
    public ListenerSessionDto listenerLogin(@Valid @RequestBody ListenerLoginRequest request, HttpServletRequest http) {
        this.limit("login", http, 30, Duration.ofMinutes(5));
        return this.accounts.login(request);
    }

    /** 202 whether or not the email has an account. */
    @PostMapping("/auth/password-reset")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestPasswordReset(@Valid @RequestBody ListenerPasswordResetRequest request, HttpServletRequest http) {
        this.limit("password-reset", http, 10, Duration.ofHours(1));
        this.accounts.requestPasswordReset(request);
    }

    @PostMapping("/auth/password-reset/confirm")
    public ListenerSessionDto confirmPasswordReset(@Valid @RequestBody ListenerPasswordResetConfirm request, HttpServletRequest http) {
        this.limit("password-reset-confirm", http, 30, Duration.ofHours(1));
        return this.accounts.confirmPasswordReset(request);
    }

    @PostMapping("/auth/verify-email")
    public UserDto verifyEmail(@Valid @RequestBody ListenerEmailVerification request, HttpServletRequest http) {
        this.limit("verify-email", http, 30, Duration.ofHours(1));
        return this.accounts.verifyEmail(request);
    }

    /** Ends every other session too, and returns a fresh one for this device. */
    @PostMapping("/me/password")
    public ListenerSessionDto changeListenerPassword(AuthenticatedUser caller, @Valid @RequestBody ListenerPasswordChange request) {
        return this.accounts.changePassword(caller.id(), request);
    }

    /** Signs out on every device, this one included. */
    @PostMapping("/me/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signOutEverywhere(AuthenticatedUser caller) {
        this.accounts.signOutEverywhere(caller.id());
    }

    /** Sends the verification email again, at most a few times an hour. */
    @PostMapping("/me/verify-email")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resendVerification(AuthenticatedUser caller) {
        this.accounts.resendVerification(caller.id());
    }

    private void limit(String action, HttpServletRequest http, int max, Duration window) {
        if (!this.limiter.allow(action + ":" + http.getRemoteAddr(), max, window)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "too many attempts from this address; wait a few minutes and try again");
        }
    }
}
