package com.jjlpg.trading;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class DatabaseSecurityTest {
    private static final List<String> TABLES = List.of(
            "users", "products", "sales", "business_settings", "loans",
            "loan_payments", "stock_movements", "tank_exchanges", "flyway_schema_history");

    @Autowired JdbcTemplate jdbc;

    @Test void appTablesAreProtectedFromDataApiRoles() {
        for (String table : TABLES) {
            Boolean rls = jdbc.queryForObject(
                    "SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                    + "WHERE n.nspname = 'public' AND c.relname = ?", Boolean.class, table);
            assertEquals(Boolean.TRUE, rls, table + " must have RLS enabled");

            for (String role : List.of("anon", "authenticated")) {
                Integer exists = jdbc.queryForObject(
                        "SELECT count(*) FROM pg_roles WHERE rolname = ?", Integer.class, role);
                if (exists != null && exists > 0) {
                    Boolean privileges = jdbc.queryForObject(
                            "SELECT has_table_privilege(?, 'public.' || ?, 'SELECT, INSERT, UPDATE, DELETE')",
                            Boolean.class, role, table);
                    assertEquals(Boolean.FALSE, privileges, role + " must not access " + table);
                }
            }
        }
    }
}
