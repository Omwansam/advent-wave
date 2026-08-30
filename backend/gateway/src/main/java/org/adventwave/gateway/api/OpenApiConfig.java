package org.adventwave.gateway.api;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityScheme.In;
import io.swagger.v3.oas.models.security.SecurityScheme.Type;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The OpenAPI document is generated from the controllers rather than hand-written, so
 * contracts/openapi/adventwave.yaml cannot drift from the code that serves it. Regenerate it
 * with tools/dump-openapi.sh; the generated TypeScript client is derived from that file.
 *
 * <p>Plan §1 day 4 calls this "the public surface". gRPC (§1 day 3) is the service-to-service
 * contract and is deliberately not what clients speak: browsers cannot originate gRPC without
 * a translating proxy, and there are no separate services to speak it between yet.
 */
@Configuration
public class OpenApiConfig {
    private static final String BEARER_SCHEME = "bearerAuth";

    static {
        // AuthenticatedUser is supplied by CurrentUserArgumentResolver from the validated JWT,
        // never bound from the request. Without this it is documented as a required `caller`
        // query parameter on every authenticated operation, and generated clients demand it.
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(AuthenticatedUser.class);
    }

    @Bean
    public OpenAPI adventWaveOpenApi(@Value("${adventwave.catalog.api-base-url}") String apiBaseUrl) {
        return new OpenAPI()
            .info(
                new Info()
                    .title("AdventWave API")
                    .version("v1")
                    .description(
                        """
                        The public REST surface for the AdventWave web and mobile clients.

                        Every endpoint except `POST /v1/auth/session` and the signed playback
                        redirect requires a bearer JWT. Until the managed IdP is chosen, tokens \
                        come from `POST /v1/auth/session`, which verifies no credential and is \
                        disabled by setting `spring.security.oauth2.resourceserver.jwt.issuer-uri`.
                        """
                    )
                    .license(new License().name("Proprietary"))
            )
            .servers(List.of(new Server().url(apiBaseUrl).description("This instance")))
            .components(
                new Components()
                    .addSecuritySchemes(
                        BEARER_SCHEME,
                        new SecurityScheme()
                            .type(Type.HTTP)
                            .scheme("bearer")
                            .bearerFormat("JWT")
                            .in(In.HEADER)
                            .name("Authorization")
                    )
            )
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
