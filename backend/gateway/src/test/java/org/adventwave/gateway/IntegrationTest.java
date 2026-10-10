package org.adventwave.gateway;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
public abstract class IntegrationTest {
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:15-alpine"))
        .withDatabaseName("adventwave")
        .withUsername("adventwave")
        .withPassword("adventwave");
    static final GenericContainer<?> REDIS = new GenericContainer(DockerImageName.parse("redis:7-alpine")).withExposedPorts(new Integer[]{6379});

    static {
        POSTGRES.start();
        REDIS.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("adventwave.player.flush-interval-ms", () -> 3600000);
        // The tests run on the published dev secrets and dev token issuer (DevDefaultsGuard).
        registry.add("adventwave.security.allow-dev-defaults", () -> true);
    }
}
