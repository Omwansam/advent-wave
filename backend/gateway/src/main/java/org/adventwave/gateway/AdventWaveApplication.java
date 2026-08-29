package org.adventwave.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(
    scanBasePackages = {"org.adventwave"}
)
@EntityScan(
    basePackages = {"org.adventwave"}
)
@EnableJpaRepositories(
    basePackages = {"org.adventwave"}
)
@ConfigurationPropertiesScan(
    basePackages = {"org.adventwave"}
)
@EnableScheduling
public class AdventWaveApplication {
    public static void main(String[] args) {
        SpringApplication.run(AdventWaveApplication.class, args);
    }
}
