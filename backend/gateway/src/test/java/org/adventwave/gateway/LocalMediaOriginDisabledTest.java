package org.adventwave.gateway;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Without adventwave.catalog.local-media-root the media path is as closed as any unknown one. */
@AutoConfigureMockMvc
class LocalMediaOriginDisabledTest extends IntegrationTest {
    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("no local media root: /media-storage needs a token like everything else")
    void closedByDefault() throws Exception {
        this.mvc.perform(get("/media-storage/derived/any/aac_96.m4a")).andExpect(status().isUnauthorized());
    }
}
