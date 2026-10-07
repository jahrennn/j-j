package com.jjlpg.trading.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Flyway locks its history table during migrations, so secure it after Flyway finishes. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FlywayHistorySecurityInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    public FlywayHistorySecurityInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        Boolean enabled = jdbc.queryForObject(
                "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.flyway_schema_history'::regclass",
                Boolean.class);
        if (!Boolean.TRUE.equals(enabled)) {
            jdbc.execute("ALTER TABLE public.flyway_schema_history ENABLE ROW LEVEL SECURITY");
        }

        jdbc.execute("""
                DO $$
                DECLARE api_role text;
                BEGIN
                    FOR api_role IN
                        SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
                    LOOP
                        EXECUTE format(
                            'REVOKE ALL PRIVILEGES ON TABLE public.flyway_schema_history FROM %I',
                            api_role);
                    END LOOP;
                END $$
                """);
    }
}
