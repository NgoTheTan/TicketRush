package com.example.TicketRush_backend.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;

public class StartupSchemaPatcher implements ApplicationContextInitializer<ConfigurableApplicationContext>, Ordered {

    private static final Logger log = LoggerFactory.getLogger(StartupSchemaPatcher.class);

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        Environment environment = applicationContext.getEnvironment();
        String url = environment.getProperty("spring.datasource.url");
        String username = environment.getProperty("spring.datasource.username");
        String password = environment.getProperty("spring.datasource.password");

        if (url == null || username == null) {
            return;
        }

        try (Connection connection = DriverManager.getConnection(url, username, Objects.toString(password, ""));
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE events ADD COLUMN IF NOT EXISTS queue_active BOOLEAN NOT NULL DEFAULT FALSE");
            statement.executeUpdate("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_url VARCHAR(1000)");
            statement.executeUpdate("ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1000)");
            log.info("Patched events missing columns before JPA validation");
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to patch missing queue_active column", ex);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
