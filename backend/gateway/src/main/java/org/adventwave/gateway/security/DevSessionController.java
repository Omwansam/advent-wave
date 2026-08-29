package org.adventwave.gateway.security;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.JWTClaimsSet.Builder;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import org.adventwave.contracts.api.UserDto;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.user.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/v1/auth"})
@ConditionalOnProperty(
    name = {"adventwave.auth.dev-issuer"},
    havingValue = "true"
)
public class DevSessionController {
    private static final Duration TOKEN_TTL = Duration.ofHours(12L);
    private final UserService users;
    private final String secret;

    public DevSessionController(UserService users, @Value("${adventwave.auth.dev-secret}") String secret) {
        this.users = users;
        this.secret = secret;
    }

    @PostMapping({"/session"})
    public DevSessionController.SessionResponse createSession(@Valid @RequestBody DevSessionController.SessionRequest request) {
        String s = request.email().trim().toLowerCase();
        String s1 = request.name() != null && !request.name().isBlank() ? request.name().trim() : s.split("@")[0];
        String s2 = "dev|" + s;
        UserAccount useraccount = this.users.provision(s2, s, s1, null);
        return new DevSessionController.SessionResponse(this.mint(s2, s, s1), "Bearer", TOKEN_TTL.toSeconds(), this.users.toDto(useraccount));
    }

    private String mint(String subject, String email, String name) {
        Instant instant = Instant.now();
        JWTClaimsSet jwtclaimsset = new Builder()
            .subject(subject)
            .issuer("adventwave-dev")
            .claim("email", email)
            .claim("name", name)
            .issueTime(Date.from(instant))
            .expirationTime(Date.from(instant.plus(TOKEN_TTL)))
            .build();
        SignedJWT signedjwt = new SignedJWT(new com.nimbusds.jose.JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(), jwtclaimsset);

        try {
            signedjwt.sign(new MACSigner(this.secret.getBytes()));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "could not mint dev token", exception);
        }

        return signedjwt.serialize();
    }

    public record SessionRequest(@Email @NotBlank String email, String name) {
    }

    public record SessionResponse(String token, String tokenType, long expiresIn, UserDto user) {
    }
}
