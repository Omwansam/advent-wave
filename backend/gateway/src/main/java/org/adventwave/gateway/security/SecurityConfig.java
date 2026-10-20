package org.adventwave.gateway.security;

import com.nimbusds.jwt.JWTParser;
import java.util.List;
import java.util.function.Supplier;
import javax.crypto.spec.SecretKeySpec;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.gateway.api.LocalMediaOriginConfig;
import org.adventwave.gateway.security.admin.AdminAccessDeniedHandler;
import org.adventwave.gateway.security.admin.AdminAccessRules;
import org.adventwave.gateway.security.admin.AdminJwtAuthenticationConverter;
import org.adventwave.gateway.security.admin.AdminPermissions;
import org.adventwave.gateway.security.admin.AdminTokenService;
import org.adventwave.gateway.security.listener.ListenerTokenService;
import org.adventwave.gateway.storage.StorageProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.SupplierJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    /** The pre-RBAC admin scope (contracts 1.2.0); still honoured on catalogue rules. See AdminPermissions. */
    public static final String CATALOG_WRITE_SCOPE = AdminPermissions.LEGACY_CATALOG_WRITE;

    /** Mirrored in OpenApiConfig.PUBLIC_OPERATIONS; keep the two in step. */
    public static final String[] LISTENER_AUTH_PATHS = {
        "/v1/auth/register", "/v1/auth/login", "/v1/auth/password-reset", "/v1/auth/password-reset/confirm", "/v1/auth/verify-email"
    };

    private static final String[] OPENAPI_PATHS = {
        "/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml", "/swagger-ui/**", "/swagger-ui.html"
    };

    @Bean
    public SecurityFilterChain filterChain(
        HttpSecurity http,
        CatalogProperties catalog,
        StorageProperties storage,
        AdminJwtAuthenticationConverter adminConverter,
        AdminAccessDeniedHandler accessDenied
    ) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(
                auth -> {
                    auth
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // The API document describes the public surface; it carries no data and is
                        // what the generated client is built from.
                        .requestMatchers(OPENAPI_PATHS).permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/auth/session").permitAll()
                        // Listener accounts (RFC 0005): sign-up, sign-in and the emailed links.
                        // Limited per client address by ListenerAuthController.
                        .requestMatchers(HttpMethod.POST, LISTENER_AUTH_PATHS).permitAll()
                        // Admin-portal sign-in: email and password, checked by AdminAccountService.
                        .requestMatchers(HttpMethod.POST, "/v1/auth/admin/login").permitAll()
                        // Already authorised by its HMAC signature and expiry, and followed by a
                        // media player that cannot attach an Authorization header to a redirect.
                        .requestMatchers(HttpMethod.GET, "/v1/media/*/stream/*").permitAll();
                    // Where that redirect lands in local development, for the same reason. Open
                    // only when the local media origin is configured.
                    if (LocalMediaOriginConfig.enabled(catalog, storage)) {
                        auth
                            .requestMatchers(HttpMethod.GET, LocalMediaOriginConfig.PATH).permitAll()
                            .requestMatchers(HttpMethod.HEAD, LocalMediaOriginConfig.PATH).permitAll()
                            // The local stand-in for a presigned PUT to the masters bucket
                            // (LocalUploadController): authorised by its HMAC signature and expiry,
                            // like the playback redirect. PUT only; nothing else is open there.
                            .requestMatchers(HttpMethod.PUT, "/v1/uploads/*").permitAll();
                    }
                    // The admin surface, by role (RFC 0001). AdminAccessRules is the one table of
                    // which operation needs which permission; the request's authorities come from
                    // the admin account as stored now (AdminJwtAuthenticationConverter).
                    for (AdminAccessRules.Rule rule : AdminAccessRules.RULES) {
                        if (rule.method() == null) {
                            auth.requestMatchers(rule.pattern()).hasAnyAuthority(rule.authorities());
                        } else {
                            auth.requestMatchers(rule.method(), rule.pattern()).hasAnyAuthority(rule.authorities());
                        }
                    }
                    // Everything else is the listener API: any authenticated listener, but not an
                    // admin-portal session, which would otherwise be provisioned as a listener.
                    auth.anyRequest().access(listenerOnly());
                }
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(adminConverter))
                .accessDeniedHandler(accessDenied))
            .exceptionHandling(e -> e.accessDeniedHandler(accessDenied));
        return http.build();
    }

    private static AuthorizationManager<RequestAuthorizationContext> listenerOnly() {
        return (Supplier<Authentication> authentication, RequestAuthorizationContext context) -> {
            Authentication a = authentication.get();
            boolean ok = a != null && a.isAuthenticated() && !(a instanceof AnonymousAuthenticationToken)
                && a.getAuthorities().stream().noneMatch(g -> AdminPermissions.ADMIN_SESSION.equals(g.getAuthority()));
            return new AuthorizationDecision(ok);
        };
    }

    /**
     * Bearer tokens are told apart by issuer, and each kind is verified with its own key: admin
     * tokens ({@code iss = adventwave-admin}) with the admin secret; listener-account tokens
     * ({@code iss = adventwave}, RFC 0005) with the listener secret and a session-version check;
     * anything else by the IdP at {@code spring.security.oauth2.resourceserver.jwt.issuer-uri} when
     * one is configured, otherwise by the dev issuer's secret — but only while the dev issuer is on,
     * so a server with it off accepts no dev token at all. The issuer is read unverified only to
     * pick the key; the chosen decoder then verifies signature, expiry and issuer.
     */
    @Bean
    public JwtDecoder jwtDecoder(
        @Value("${adventwave.auth.dev-secret}") String devSecret,
        @Value("${adventwave.auth.dev-issuer:false}") boolean devIssuer,
        @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}") String issuerUri,
        AdminTokenService adminTokens,
        ListenerTokenService listenerTokens
    ) {
        JwtDecoder admins = adminTokens.decoder();
        JwtDecoder accounts = listenerTokens.decoder();
        JwtDecoder idp = issuerUri.isBlank() ? null : new SupplierJwtDecoder(() -> JwtDecoders.fromIssuerLocation(issuerUri));
        JwtDecoder dev = devIssuer ? NimbusJwtDecoder.withSecretKey(new SecretKeySpec(devSecret.getBytes(), "HmacSHA256")).build() : null;
        return token -> {
            String issuer = unverifiedIssuer(token);
            if (AdminTokenService.ISSUER.equals(issuer)) return admins.decode(token);
            if (ListenerTokenService.ISSUER.equals(issuer)) return accounts.decode(token);
            if (idp != null) return idp.decode(token);
            if (dev != null) return dev.decode(token);
            throw new BadJwtException("tokens from this issuer are not accepted here");
        };
    }

    private static String unverifiedIssuer(String token) {
        try {
            return JWTParser.parse(token).getJWTClaimsSet().getIssuer();
        } catch (Exception e) {
            throw new BadJwtException("malformed token", e);
        }
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Value("${adventwave.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration corsconfiguration = new CorsConfiguration();
        corsconfiguration.setAllowedOrigins(allowedOrigins);
        corsconfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        corsconfiguration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        corsconfiguration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource urlbasedcorsconfigurationsource = new UrlBasedCorsConfigurationSource();
        urlbasedcorsconfigurationsource.registerCorsConfiguration("/**", corsconfiguration);
        return urlbasedcorsconfigurationsource;
    }
}
