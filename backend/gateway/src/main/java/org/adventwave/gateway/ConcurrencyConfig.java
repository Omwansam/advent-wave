package org.adventwave.gateway;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.concurrent.DelegatingSecurityContextExecutorService;

@Configuration
public class ConcurrencyConfig {
    @Bean(
        name = {"fanOutExecutor"},
        destroyMethod = "close"
    )
    public ExecutorService fanOutExecutor() {
        return new DelegatingSecurityContextExecutorService(Executors.newVirtualThreadPerTaskExecutor());
    }
}
