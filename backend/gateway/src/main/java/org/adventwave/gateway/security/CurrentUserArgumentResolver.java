package org.adventwave.gateway.security;

import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.user.UserService;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
    private final UserService users;

    public CurrentUserArgumentResolver(UserService users) {
        this.users = users;
    }

    public boolean supportsParameter(MethodParameter parameter) {
        return AuthenticatedUser.class.equals(parameter.getParameterType());
    }

    public Object resolveArgument(
        MethodParameter parameter, ModelAndViewContainer mavContainer, NativeWebRequest webRequest, WebDataBinderFactory binderFactory
    ) {
        return current(this.users);
    }

    public static AuthenticatedUser current(UserService users) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object object;
        if (authentication != null && (object = authentication.getPrincipal()) instanceof Jwt) {
            Jwt jwt = (Jwt)object;
            String subject = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            String s2 = jwt.getClaimAsString("name");
            if (s2 == null || s2.isBlank()) {
                s2 = email == null ? "Listener" : email.split("@")[0];
            }

            UserAccount useraccount = users.provision(subject, email, s2, jwt.getClaimAsString("region"));
            return new AuthenticatedUser(useraccount.getId(), useraccount.getExternalAuthId(), useraccount.getEmail(), useraccount.getDisplayName());
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "authentication required");
        }
    }
}
