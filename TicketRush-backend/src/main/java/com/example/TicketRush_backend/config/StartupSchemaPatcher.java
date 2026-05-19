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
            statement.executeUpdate("ALTER TABLE customer_profiles ALTER COLUMN phone DROP NOT NULL");
            statement.executeUpdate("ALTER TABLE customer_profiles ALTER COLUMN date_of_birth DROP NOT NULL");
            statement.executeUpdate("ALTER TABLE customer_profiles ALTER COLUMN gender DROP NOT NULL");
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id BIGSERIAL PRIMARY KEY,
                        recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        type VARCHAR(50) NOT NULL,
                        title VARCHAR(200) NOT NULL,
                        message TEXT NOT NULL,
                        link_url VARCHAR(500),
                        event_id BIGINT,
                        order_id BIGINT,
                        read_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """);
            statement.executeUpdate("CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC)");
            statement.executeUpdate("CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications (recipient_id, read_at) WHERE read_at IS NULL");
            statement.executeUpdate("CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_event_reminder ON notifications (recipient_id, type, event_id) WHERE type = 'EVENT_REMINDER_24H' AND event_id IS NOT NULL");
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
