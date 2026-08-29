package org.adventwave.gateway.security;

import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.annotation.web.configurers.SessionManagementConfigurer;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer.AuthorizationManagerRequestMatcherRegistry;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer.AuthorizedUrl;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.resource.OAuth2ResourceServerConfigurer;
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
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(
                auth -> ((AuthorizedUrl)((AuthorizedUrl)((AuthorizedUrl)((AuthorizedUrl)auth.requestMatchers(
                                    new String[]{"/actuator/health/**", "/actuator/info"}
                                ))
                                .permitAll()
                                .requestMatchers(HttpMethod.POST, new String[]{"/v1/auth/session"}))
                            .permitAll()
                            .requestMatchers(HttpMethod.GET, new String[]{"/v1/media/*/stream/*"}))
                        .permitAll()
                        .anyRequest())
                    .authenticated()
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
