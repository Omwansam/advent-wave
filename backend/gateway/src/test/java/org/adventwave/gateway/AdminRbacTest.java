package org.adventwave.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import java.util.List;
import java.util.UUID;
import org.adventwave.gateway.security.admin.AdminAccountRepository;
import org.adventwave.gateway.security.admin.AdminRole;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The role matrix of AdminRole × AdminAccessRules, asserted through HTTP (RFC 0001). An allowed
 * call is aimed at an invalid body or a missing id, so it gets past authorisation (400/404) and
 * changes nothing; a refused one is 403. Either way the gateway decided, not the client.
 */
@AutoConfigureMockMvc
class AdminRbacTest extends IntegrationTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    AdminAccountRepository accounts;

    private record Call(String name, HttpMethod method, String path, String body, List<AdminRole> allowed) {
    }

    private static final String MISSING = UUID.randomUUID().toString();
    private static final List<AdminRole> EVERYONE = List.of(AdminRole.values());
    private static final List<AdminRole> RIGHTS = List.of(AdminRole.SUPER_ADMIN, AdminRole.RIGHTS_MANAGER);
    private static final List<AdminRole> CONTENT = List.of(AdminRole.SUPER_ADMIN, AdminRole.CONTENT_MANAGER);
    private static final List<AdminRole> SUPER = List.of(AdminRole.SUPER_ADMIN);

    private static final List<Call> CALLS = List.of(
        new Call("read churches", HttpMethod.GET, "/v1/admin/churches", null, EVERYONE),
        new Call("read media", HttpMethod.GET, "/v1/admin/media?limit=1", null, EVERYONE),
        new Call("read own account", HttpMethod.GET, "/v1/admin/me", null, EVERYONE),
        new Call("create church", HttpMethod.POST, "/v1/admin/churches", "{}", RIGHTS),
        new Call("church consent", HttpMethod.PUT, "/v1/admin/churches/" + MISSING + "/consent", "{\"consentStatus\":\"granted\"}", RIGHTS),
        new Call("create licence", HttpMethod.POST, "/v1/admin/licenses", "{}", RIGHTS),
        new Call("licence status", HttpMethod.PUT, "/v1/admin/licenses/" + MISSING + "/status", "{\"consentStatus\":\"granted\"}", RIGHTS),
        new Call("create artist", HttpMethod.POST, "/v1/admin/artists", "{}", CONTENT),
        new Call("create album", HttpMethod.POST, "/v1/admin/albums", "{}", CONTENT),
        new Call("create media", HttpMethod.POST, "/v1/admin/media", "{}", CONTENT),
        new Call("edit media", HttpMethod.PATCH, "/v1/admin/media/" + MISSING, "{}", CONTENT),
        new Call("upload a master", HttpMethod.POST, "/v1/admin/media/" + MISSING + "/upload", "{}", CONTENT),
        new Call("request a transcode", HttpMethod.POST, "/v1/admin/media/" + MISSING + "/transcode", "{}", CONTENT),
        new Call("publish", HttpMethod.POST, "/v1/admin/media/" + MISSING + "/publish", null, CONTENT),
        new Call("withdraw", HttpMethod.POST, "/v1/admin/media/" + MISSING + "/withdraw", null, CONTENT),
        new Call("list accounts", HttpMethod.GET, "/v1/admin/accounts", null, SUPER),
        new Call("create account", HttpMethod.POST, "/v1/admin/accounts", "{}", SUPER),
        new Call("reset a password", HttpMethod.POST, "/v1/admin/accounts/" + MISSING + "/password", "{}", SUPER)
    );

    @ParameterizedTest(name = "{0}")
    @EnumSource(AdminRole.class)
    @DisplayName("each role gets exactly the operations its permissions name")
    void matrix(AdminRole role) throws Exception {
        String token = AdminTestSupport.token(this.mvc, this.accounts, role);
        for (Call call : CALLS) {
            var builder = request(call.method(), call.path()).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token));
            if (call.body() != null) builder.contentType(MediaType.APPLICATION_JSON).content(call.body());
            int status = this.mvc.perform(builder).andReturn().getResponse().getStatus();
            if (call.allowed().contains(role)) {
                Assertions.assertThat(status).as("%s as %s", call.name(), role).isNotIn(401, 403);
            } else {
                Assertions.assertThat(status).as("%s as %s", call.name(), role).isEqualTo(403);
            }
        }
    }

    @Test
    @DisplayName("without a token every admin operation is 401")
    void anonymous() throws Exception {
        for (Call call : CALLS) {
            var builder = request(call.method(), call.path());
            if (call.body() != null) builder.contentType(MediaType.APPLICATION_JSON).content(call.body());
            Assertions.assertThat(this.mvc.perform(builder).andReturn().getResponse().getStatus()).as(call.name()).isEqualTo(401);
        }
    }

    @Test
    @DisplayName("a listener token is 403 on every admin operation")
    void listener() throws Exception {
        String token = AdminTestSupport.listenerToken(this.mvc);
        for (Call call : CALLS) {
            var builder = request(call.method(), call.path()).header(HttpHeaders.AUTHORIZATION, AdminTestSupport.bearer(token));
            if (call.body() != null) builder.contentType(MediaType.APPLICATION_JSON).content(call.body());
            Assertions.assertThat(this.mvc.perform(builder).andReturn().getResponse().getStatus()).as(call.name()).isEqualTo(403);
        }
    }
}
