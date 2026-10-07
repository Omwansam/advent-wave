package org.adventwave.gateway.security;

import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.adventwave.catalog.CatalogProperties;
import org.adventwave.gateway.api.LocalMediaOriginConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    /** The scope that grants the ingest surface — the string an IdP puts in the `scope` claim. */
    public static final String CATALOG_WRITE_SCOPE = "catalog:write";
    static final String CATALOG_WRITE_AUTHORITY = "SCOPE_" + CATALOG_WRITE_SCOPE;

    private static final String[] OPENAPI_PATHS = {
        "/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml", "/swagger-ui/**", "/swagger-ui.html"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, CatalogProperties catalog) throws Exception {
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
                        // Already authorised by its HMAC signature and expiry, and followed by a
                        // media player that cannot attach an Authorization header to a redirect.
                        .requestMatchers(HttpMethod.GET, "/v1/media/*/stream/*").permitAll();
                    // Where that redirect lands in local development, for the same reason. Open
                    // only when the local media origin is configured.
                    if (LocalMediaOriginConfig.enabled(catalog)) {
                        auth
                            .requestMatchers(HttpMethod.GET, LocalMediaOriginConfig.PATH).permitAll()
                            .requestMatchers(HttpMethod.HEAD, LocalMediaOriginConfig.PATH).permitAll();
                    }
                    auth
                        // The ingest surface. Spring's default JWT converter turns a `scope` claim into
                        // SCOPE_* authorities, so this works unchanged with any OAuth IdP that issues
                        // scopes; the dev issuer mints it for adventwave.auth.admin-emails.
                        .requestMatchers("/v1/admin/**").hasAuthority(CATALOG_WRITE_AUTHORITY)
                        .anyRequest().authenticated();
                }
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return (SecurityFilterChain)http.build();
    }

    @Bean
    @ConditionalOnProperty(
        name = {"spring.security.oauth2.resourceserver.jwt.issuer-uri"},
        matchIfMissing = true,
        havingValue = ""
    )
    public JwtDecoder devJwtDecoder(@Value("${adventwave.auth.dev-secret}") String secret) {
        return NimbusJwtDecoder.withSecretKey(new SecretKeySpec(secret.getBytes(), "HmacSHA256")).build();
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
