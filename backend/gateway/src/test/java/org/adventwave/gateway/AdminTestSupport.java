package org.adventwave.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.adventwave.gateway.security.admin.AdminAccount;
import org.adventwave.gateway.security.admin.AdminAccountRepository;
import org.adventwave.gateway.security.admin.AdminRole;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

/** Admin accounts and tokens for MockMvc tests, made the way production makes them. */
final class AdminTestSupport {
    static final String PASSWORD = "Correct-Horse-Battery-9";
    private static final PasswordEncoder ENCODER = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private static final ObjectMapper JSON = new ObjectMapper();

    private AdminTestSupport() {
    }

    /** A fresh account with {@link #PASSWORD}; {@code mustChange} as a new or reset account has it. */
    static AdminAccount account(AdminAccountRepository accounts, AdminRole role, boolean mustChange) {
        String email = role.wireValue() + "-" + UUID.randomUUID() + "@adventwave.test";
        return accounts.saveAndFlush(new AdminAccount(email, "Test " + role.wireValue(), ENCODER.encode(PASSWORD), role, mustChange));
    }

    /** Signs in through POST /v1/auth/admin/login and returns the bearer token. */
    static String login(MockMvc mvc, String email, String password) throws Exception {
        String body = mvc.perform(post("/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(java.util.Map.of("email", email, "password", password))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JSON.readTree(body).path("token").asText();
    }

    static String token(MockMvc mvc, AdminAccountRepository accounts, AdminRole role) throws Exception {
        return login(mvc, account(accounts, role, false).getEmail(), PASSWORD);
    }

    static String bearer(String token) {
        return "Bearer " + token;
    }

    /** A listener token from the dev issuer — no admin scope since RFC 0001. */
    static String listenerToken(MockMvc mvc) throws Exception {
        String body = mvc.perform(post("/v1/auth/session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"listener-" + UUID.randomUUID() + "@adventwave.test\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JSON.readTree(body).path("token").asText();
    }

    static JsonNode json(String body) throws Exception {
        return JSON.readTree(body);
    }
}
