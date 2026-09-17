package org.adventwave.gateway.api;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem.HttpMethod;
import io.swagger.v3.oas.models.headers.Header;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityScheme.In;
import io.swagger.v3.oas.models.security.SecurityScheme.Type;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.springdoc.core.customizers.OpenApiCustomizer;
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
    public OpenAPI adventWaveOpenApi(
        @Value("${adventwave.catalog.api-base-url}") String apiBaseUrl,
        // The contract version, as in <repo>/contracts/VERSION. Bumped together with it by the
        // RFC that changes the surface; CI checks the two agree.
        @Value("${adventwave.contracts.version:1.0.0}") String contractVersion
    ) {
        return new OpenAPI()
            .info(
                new Info()
                    .title("AdventWave API")
                    .version(contractVersion)
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

    /**
     * Makes the generated document say what the controllers actually do, in the places where
     * springdoc cannot see it. Every correction below is derived from code, not authored:
     *
     * <ul>
     *   <li>The error body is the one {@link ApiExceptionHandler#body} builds for every handled
     *       exception. springdoc does not read {@code @RestControllerAdvice}.</li>
     *   <li>Two operations are public — the same two {@code permitAll} matchers as in
     *       {@code SecurityConfig}. Without this the global bearer requirement is stated on them,
     *       and a generated client would refuse to call the playback redirect without a token.</li>
     *   <li>Two DELETEs return {@code ResponseEntity.noContent()} and the playback redirect
     *       returns {@code HttpStatus.FOUND}; springdoc reports 200 for a {@code ResponseEntity}
     *       whose status is set in the body of the method.</li>
     * </ul>
     *
     * <p>The durable fix for the status codes is {@code @ResponseStatus} on those three methods,
     * at which point their entries here become dead and should be deleted. Until then this is
     * the single place the contract and the controllers are reconciled.
     */
    @Bean
    public OpenApiCustomizer adventWaveContractCustomizer() {
        return openApi -> {
            openApi.getComponents().addSchemas("Error", errorSchema());
            openApi.getPaths().forEach((path, item) -> item.readOperationsMap().forEach((method, op) -> {
                tagByResource(op);
                addErrorResponses(path, method, op);
                if (PUBLIC_OPERATIONS.contains(method + " " + path)) {
                    op.setSecurity(List.of());
                }
                correctStatusCode(path, method, op);
            }));
        };
    }

    // Mirrors SecurityConfig's permitAll matchers for API operations. Keep the two in step.
    private static final Set<String> PUBLIC_OPERATIONS = Set.of(
        "POST /v1/auth/session",
        "GET /v1/media/{id}/stream/{profile}"
    );

    private static final Map<String, String> TAG_BY_CONTROLLER = Map.ofEntries(
        Map.entry("dev-session-controller", "auth"),
        Map.entry("me-controller", "account"),
        Map.entry("home-controller", "catalogue"),
        Map.entry("media-controller", "media"),
        Map.entry("search-controller", "search"),
        Map.entry("library-controller", "library"),
        Map.entry("playlist-controller", "playlists"),
        Map.entry("player-state-controller", "player"),
        Map.entry("recommendation-controller", "recommendations"),
        Map.entry("events-controller", "events"),
        Map.entry("church-admin-controller", "admin: contributors"),
        Map.entry("catalog-admin-controller", "admin: catalogue")
    );

    private static void tagByResource(Operation op) {
        if (op.getTags() != null) {
            op.setTags(op.getTags().stream().map(t -> TAG_BY_CONTROLLER.getOrDefault(t, t)).toList());
        }
    }

    private static Schema<?> errorSchema() {
        return new ObjectSchema()
            .description("Body of every error the API produces (ApiExceptionHandler).")
            .addProperty("status", new IntegerSchema().description("HTTP status code, repeated"))
            .addProperty("error", new StringSchema().description("HTTP reason phrase"))
            .addProperty("message", new StringSchema().description("What went wrong, in one sentence"))
            .addProperty("timestamp", new StringSchema().format("date-time"))
            .required(List.of("status", "error", "message", "timestamp"));
    }

    private static void addErrorResponses(String path, HttpMethod method, Operation op) {
        boolean hasInput = op.getRequestBody() != null
            || (op.getParameters() != null && !op.getParameters().isEmpty())
            || path.contains("{");
        if (hasInput) {
            error(op, "400", "Validation failed, a parameter would not convert, or a referenced item is unknown");
        }
        if (!PUBLIC_OPERATIONS.contains(method + " " + path)) {
            // Produced by Spring Security's BearerTokenAuthenticationEntryPoint before any
            // controller runs, so it has no JSON body — only a WWW-Authenticate header. Verified
            // against the live gateway; contracts/examples/api/error.unauthorized.json.
            if (!op.getResponses().containsKey("401")) {
                op.getResponses().addApiResponse("401", new ApiResponse()
                    .description("Missing, expired, or unverifiable bearer token. Empty body.")
                    .addHeaderObject("WWW-Authenticate", new Header()
                        .description("`Bearer`, with error=\"invalid_token\" and a description when a token was presented")
                        .schema(new StringSchema())));
            }
        }
        if (path.contains("{")) {
            error(op, "404", "Not found — also returned when the caller does not own the resource");
        }
        if (path.equals("/v1/media/{id}/stream/{profile}")) {
            error(op, "403", "Signature invalid or expired");
        }
        if (path.equals("/v1/events/playback")) {
            error(op, "429", "More than adventwave.events.playback-per-minute events this minute");
        }
        if (path.startsWith("/v1/admin/")) {
            // SecurityConfig: hasAuthority(SCOPE_catalog:write). A valid token without the scope is 403.
            error(op, "403", "The token lacks the catalog:write scope");
            if (method != HttpMethod.GET) {
                // CatalogAdminService throws AdminConflictException for state refusals:
                // duplicate name/slug/title, wrong status for the transition, licence not granted.
                error(op, "409", "The target's current state refuses this operation; the message says why");
            }
            op.setSecurity(List.of(new SecurityRequirement().addList(BEARER_SCHEME, List.of("catalog:write"))));
        }
        error(op, "500", "Unhandled failure; the body carries no detail");
    }

    private static void error(Operation op, String code, String description) {
        if (op.getResponses().containsKey(code)) return;
        op.getResponses().addApiResponse(code, new ApiResponse()
            .description(description)
            .content(new Content().addMediaType("application/json",
                new MediaType().schema(new Schema<>().$ref("#/components/schemas/Error")))));
    }

    private static void correctStatusCode(String path, HttpMethod method, Operation op) {
        boolean noContent = method == HttpMethod.DELETE
            && (path.equals("/v1/history") || path.equals("/v1/playlists/{id}"));
        if (noContent) {
            op.getResponses().remove("200");
            op.getResponses().addApiResponse("204", new ApiResponse().description("Deleted"));
        }
        if (method == HttpMethod.GET && path.equals("/v1/media/{id}/stream/{profile}")) {
            op.getResponses().remove("200");
            op.getResponses().addApiResponse("302", new ApiResponse()
                .description("Redirect to the media bytes for this profile. Follow it with the media player, not fetch.")
                .addHeaderObject("Location", new Header().schema(new StringSchema().format("uri"))));
        }
    }
}
