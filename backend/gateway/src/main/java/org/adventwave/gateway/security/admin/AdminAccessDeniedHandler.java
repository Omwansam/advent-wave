package org.adventwave.gateway.security.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * A 403 that says why, in the error body every other refusal uses (ApiExceptionHandler): which
 * permission the operation needs, or that the password must be changed first, or that an
 * admin-portal session cannot call the listener API. Keeps the RFC 6750 WWW-Authenticate header
 * Spring's default handler writes, for clients that read it.
 */
@Component
public class AdminAccessDeniedHandler implements AccessDeniedHandler {
    private final BearerTokenAccessDeniedHandler bearer = new BearerTokenAccessDeniedHandler();
    private final ObjectMapper objectMapper;

    public AdminAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException denied) throws IOException {
        this.bearer.handle(request, response, denied);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean adminSession = auth != null && auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority).anyMatch(AdminPermissions.ADMIN_SESSION::equals);
        String path = request.getRequestURI().substring(request.getContextPath().length());

        String message;
        if (!path.startsWith("/v1/admin/")) {
            message = adminSession
                ? "an admin-portal session cannot use the listener API"
                : "the token does not allow this operation";
        } else {
            String needed = AdminAccessRules.match(HttpMethod.valueOf(request.getMethod()), path)
                .map(AdminAccessRules.Rule::permission).orElse("an admin permission");
            boolean passwordPending = adminSession && auth.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().startsWith("SCOPE_"));
            if (passwordPending) {
                message = "change your password before doing anything else";
            } else if (!adminSession && !AdminPermissions.ADMIN_SESSION.equals(needed)) {
                message = "this needs an admin account with the " + needed + " permission";
            } else if (AdminPermissions.ADMIN_SESSION.equals(needed)) {
                message = "this needs an admin-portal session; sign in at POST /v1/auth/admin/login";
            } else {
                message = "your role does not allow this; it needs the " + needed + " permission";
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("error", HttpStatus.FORBIDDEN.getReasonPhrase());
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        this.objectMapper.writeValue(response.getOutputStream(), body);
    }
}
