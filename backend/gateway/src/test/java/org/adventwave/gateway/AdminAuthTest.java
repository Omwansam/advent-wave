package org.adventwave.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.adventwave.gateway.security.admin.AdminAccount;
import org.adventwave.gateway.security.admin.AdminAccountRepository;
import org.adventwave.gateway.security.admin.AdminRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Admin-portal sign-in (RFC 0001): passwords, lockout, forced change, and the per-request check
 * that makes a role change, a password change, a deactivation or a sign-out take effect at once.
 */
@AutoConfigureMockMvc
class AdminAuthTest extends IntegrationTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    AdminAccountRepository accounts;

    private static String login(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    @DisplayName("a wrong password and an unknown email get the same 401, saying neither which")
    void wrongCredentialsAreIndistinguishable() throws Exception {
        AdminAccount a = AdminTestSupport.account(this.accounts, AdminRole.VIEWER, false);
        this.mvc.perform(post("/v1/auth/admin/login").contentType(MediaType.APPLICATION_JSON).content(login(a.getEmail(), "Wrong-Password-1")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("email or password is incorrect"));
        this.mvc.perform(post("/v1/auth/admin/login").contentType(MediaType.APPLICATION_JSON).content(login("nobody@adventwave.test", "Wrong-Password-1")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("email or password is incorrect"));
    }

    @Test
    @DisplayName("sign-in returns the account's role and permissions; the email is case-insensitive")
    void signIn() throws Exception {
        AdminAccount a = AdminTestSupport.account(this.accounts, AdminRole.CONTENT_MANAGER, false);
        this.mvc.perform(post("/v1/auth/admin/login").contentType(MediaType.APPLICATION_JSON)
                .content(login(a.getEmail().toUpperCase(), AdminTestSupport.PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.account.role").value("content_manager"))
            .andExpect(jsonPath("$.account.permissions.length()").value(3))
            .andExpect(jsonPath("$.account.mustChangePassword").value(false));
    }

    @Test
    @DisplayName("five wrong passwords lock the account; the right one is then refused with 429, and open sessions survive")
    void lockout() throws Exception {
        AdminAccount a = AdminTestSupport.account(this.accounts, AdminRole.VIEWER, false);
        String token = AdminTestSupport.login(this.mvc, a.getEmail(), AdminTestSupport.PASSWORD);
        for (int i = 0; i < 5; i++) {
            this.mvc.perform(post("/v1/auth/admin/login").contentType(MediaType.APPLICATION_JSON).content(login(a.getEmail(), "Wrong-Guess-" + i + "-xyz")))
                .andExpect(status().isUnauthorized());
        }
        this.mvc.perform(post("/v1/auth/admin/login").contentType(MediaType.APPLICATION_JSON).content(login(a.getEmail(), AdminTestSupport.PASSWORD)))
            .andExpect(status().isTooManyRequests());
        this.mvc.perform(get("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token)))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a temporary password opens /me and the password change, nothing else, until it is replaced")
    void forcedPasswordChange() throws Exception {
        AdminAccount a = AdminTestSupport.account(this.accounts, AdminRole.SUPER_ADMIN, true);
        String temporary = AdminTestSupport.login(this.mvc, a.getEmail(), AdminTestSupport.PASSWORD);
        this.mvc.perform(get("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(temporary)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("change your password before doing anything else"));
        this.mvc.perform(get("/v1/admin/me").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(temporary)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mustChangePassword").value(true));

        String body = this.mvc.perform(post("/v1/admin/me/password").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(temporary))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"" + AdminTestSupport.PASSWORD + "\",\"newPassword\":\"A-Brand-New-Passphrase\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.account.mustChangePassword").value(false))
            .andReturn().getResponse().getContentAsString();
        String fresh = AdminTestSupport.json(body).path("token").asText();

        this.mvc.perform(get("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(temporary)))
            .andExpect(status().isUnauthorized());
        this.mvc.perform(get("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(fresh)))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a short password is refused, and so is a wrong current password")
    void passwordRules() throws Exception {
        AdminAccount a = AdminTestSupport.account(this.accounts, AdminRole.VIEWER, false);
        String token = AdminTestSupport.login(this.mvc, a.getEmail(), AdminTestSupport.PASSWORD);
        this.mvc.perform(post("/v1/admin/me/password").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"" + AdminTestSupport.PASSWORD + "\",\"newPassword\":\"short\"}"))
            .andExpect(status().isBadRequest());
        this.mvc.perform(post("/v1/admin/me/password").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Not-The-Password-1\",\"newPassword\":\"A-Brand-New-Passphrase\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("the current password is incorrect"));
    }

    @Test
    @DisplayName("a role change ends the account's sessions at once, and the new role applies at the next sign-in")
    void roleChangeRevokes() throws Exception {
        String superToken = AdminTestSupport.token(this.mvc, this.accounts, AdminRole.SUPER_ADMIN);
        AdminAccount viewer = AdminTestSupport.account(this.accounts, AdminRole.VIEWER, false);
        String viewerToken = AdminTestSupport.login(this.mvc, viewer.getEmail(), AdminTestSupport.PASSWORD);

        this.mvc.perform(patch("/v1/admin/accounts/{id}", viewer.getId()).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(superToken))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"rights_manager\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("rights_manager"));
        this.mvc.perform(get("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(viewerToken)))
            .andExpect(status().isUnauthorized());

        String again = AdminTestSupport.login(this.mvc, viewer.getEmail(), AdminTestSupport.PASSWORD);
        this.mvc.perform(post("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(again))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Rights Test Church\"}"))
            .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("a disabled account cannot sign in and its open sessions end")
    void deactivation() throws Exception {
        String superToken = AdminTestSupport.token(this.mvc, this.accounts, AdminRole.SUPER_ADMIN);
        AdminAccount viewer = AdminTestSupport.account(this.accounts, AdminRole.VIEWER, false);
        String viewerToken = AdminTestSupport.login(this.mvc, viewer.getEmail(), AdminTestSupport.PASSWORD);
        this.mvc.perform(patch("/v1/admin/accounts/{id}", viewer.getId()).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(superToken))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
            .andExpect(status().isOk());
        this.mvc.perform(get("/v1/admin/me").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(viewerToken)))
            .andExpect(status().isUnauthorized());
        this.mvc.perform(post("/v1/auth/admin/login").contentType(MediaType.APPLICATION_JSON).content(login(viewer.getEmail(), AdminTestSupport.PASSWORD)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("nobody changes their own role or disables themself")
    void selfProtection() throws Exception {
        AdminAccount me = AdminTestSupport.account(this.accounts, AdminRole.SUPER_ADMIN, false);
        String token = AdminTestSupport.login(this.mvc, me.getEmail(), AdminTestSupport.PASSWORD);
        this.mvc.perform(patch("/v1/admin/accounts/{id}", me.getId()).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"viewer\"}"))
            .andExpect(status().isConflict());
        this.mvc.perform(patch("/v1/admin/accounts/{id}", me.getId()).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("sign-out everywhere ends every session of the account")
    void signOutEverywhere() throws Exception {
        AdminAccount a = AdminTestSupport.account(this.accounts, AdminRole.VIEWER, false);
        String first = AdminTestSupport.login(this.mvc, a.getEmail(), AdminTestSupport.PASSWORD);
        String second = AdminTestSupport.login(this.mvc, a.getEmail(), AdminTestSupport.PASSWORD);
        this.mvc.perform(post("/v1/admin/me/sign-out").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(second)))
            .andExpect(status().isNoContent());
        this.mvc.perform(get("/v1/admin/me").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(first)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("an admin token cannot use the listener API, and a dev-issuer listener token cannot use the admin API")
    void tokensStayOnTheirSide() throws Exception {
        String admin = AdminTestSupport.token(this.mvc, this.accounts, AdminRole.SUPER_ADMIN);
        this.mvc.perform(get("/v1/me").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(admin)))
            .andExpect(status().isForbidden());
        String listener = AdminTestSupport.listenerToken(this.mvc);
        this.mvc.perform(get("/v1/admin/churches").header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(listener)))
            .andExpect(status().isForbidden());
        this.mvc.perform(get("/v1/admin/churches")).andExpect(status().isUnauthorized());
    }
}
