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

    private static final String[] OPENAPI_PATHS = {
        "/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml", "/swagger-ui/**", "/swagger-ui.html"
    };

    @Bean
    public SecurityFilterChain filterChain(
        HttpSecurity http,
        CatalogProperties catalog,
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
                        // Admin-portal sign-in: email and password, checked by AdminAccountService.
                        .requestMatchers(HttpMethod.POST, "/v1/auth/admin/login").permitAll()
                        // Already authorised by its HMAC signature and expiry, and followed by a
                        // media player that cannot attach an Authorization header to a redirect.
                        .requestMatchers(HttpMethod.GET, "/v1/media/*/stream/*").permitAll();
                    // Where that redirect lands in local development, for the same reason. Open
                    // only when the local media origin is configured.
                    if (LocalMediaOriginConfig.enabled(catalog)) {
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
     * Two kinds of bearer token, told apart by issuer and each verified with its own key: admin
     * tokens ({@code iss = adventwave-admin}) with the admin secret, everything else as before —
     * the dev issuer's secret, or the IdP at {@code spring.security.oauth2.resourceserver.jwt.issuer-uri}
     * once one is configured. The issuer is read unverified only to pick the key; the chosen
     * decoder then verifies signature, expiry and, for admin tokens, the issuer itself.
     */
    @Bean
    public JwtDecoder jwtDecoder(
        @Value("${adventwave.auth.dev-secret}") String devSecret,
        @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}") String issuerUri,
        AdminTokenService adminTokens
    ) {
        JwtDecoder listeners = issuerUri.isBlank()
            ? NimbusJwtDecoder.withSecretKey(new SecretKeySpec(devSecret.getBytes(), "HmacSHA256")).build()
            : new SupplierJwtDecoder(() -> JwtDecoders.fromIssuerLocation(issuerUri));
        JwtDecoder admins = adminTokens.decoder();
        return token -> AdminTokenService.ISSUER.equals(unverifiedIssuer(token)) ? admins.decode(token) : listeners.decode(token);
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
