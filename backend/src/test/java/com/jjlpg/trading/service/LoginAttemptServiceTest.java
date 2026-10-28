package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.LoginResponse;
import com.jjlpg.trading.entity.StaffRole;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class LoginAttemptServiceTest {
    static class TestClock extends Clock {
        Instant now = Instant.parse("2026-10-29T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
    TestClock clock = new TestClock();
    LoginAttemptService limiter = new LoginAttemptService(clock);
    LoginResponse success(String username, StaffRole role) { return new LoginResponse("test-token", username, role); }
    LoginResponse invalid() { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password."); }
    void fail(String username) {
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> limiter.authenticate(username, this::invalid)).getStatusCode().value());
    }
    @Test void successfulSignInsNeverConsumeAnyRoleRetryAllowance() {
        for (StaffRole role : StaffRole.values()) {
            String user = role.name().toLowerCase();
            for (int i = 0; i < 12; i++) assertEquals(role, limiter.authenticate(user, () -> success(user, role)).role());
        }
    }
    @Test void oneAccountLockDoesNotBlockOtherRolesOrAnotherAccountInSameRole() {
        for (int i = 0; i < 5; i++) fail("cashier-one");
        var blocked = assertThrows(ResponseStatusException.class, () -> limiter.authenticate("cashier-one", () -> success("cashier-one", StaffRole.CASHIER)));
        assertEquals(429, blocked.getStatusCode().value());
        assertEquals("900", blocked.getHeaders().getFirst("Retry-After"));
        for (var entry : Map.of("owner", StaffRole.OWNER, "driver", StaffRole.DRIVER, "cashier-two", StaffRole.CASHIER).entrySet()) {
            assertEquals(entry.getKey(), limiter.authenticate(entry.getKey(), () -> success(entry.getKey(), entry.getValue())).username());
        }
    }
    @Test void successResetsPreviousFailuresAndUsernameVariantsShareOneCounter() {
        for (int i = 0; i < 4; i++) fail(" Cashier ");
        limiter.authenticate("cashier", () -> success("cashier", StaffRole.CASHIER));
        for (int i = 0; i < 5; i++) fail("CASHIER");
        assertEquals(429, assertThrows(ResponseStatusException.class, () -> limiter.authenticate("cashier", this::invalid)).getStatusCode().value());
    }
    @Test void cooldownExpiresWithoutARealTimeWait() {
        for (int i = 0; i < 5; i++) fail("driver");
        clock.now = clock.now.plusSeconds(899);
        var blocked = assertThrows(ResponseStatusException.class, () -> limiter.authenticate("driver", this::invalid));
        assertEquals(429, blocked.getStatusCode().value()); assertEquals("1", blocked.getHeaders().getFirst("Retry-After"));
        clock.now = clock.now.plusSeconds(1);
        assertEquals("driver", limiter.authenticate("driver", () -> success("driver", StaffRole.DRIVER)).username());
    }
    @Test void serverFailuresDoNotUsePasswordRetries() {
        for (int i = 0; i < 10; i++) assertThrows(IllegalStateException.class,
                () -> limiter.authenticate("owner", () -> { throw new IllegalStateException("Database unavailable"); }));
        assertEquals("owner", limiter.authenticate("owner", () -> success("owner", StaffRole.OWNER)).username());
    }
    @Test void simultaneousFailuresCannotOverrunTheAllowance() throws Exception {
        var pool = Executors.newFixedThreadPool(6); var start = new CountDownLatch(1); var checked = new AtomicInteger();
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < 6; i++) results.add(pool.submit(() -> {
                start.await();
                try { limiter.authenticate("same-account", () -> { checked.incrementAndGet(); return invalid(); }); return 200; }
                catch (ResponseStatusException e) { return e.getStatusCode().value(); }
            }));
            start.countDown(); int denied = 0;
            for (var result : results) if (result.get(5, TimeUnit.SECONDS) == 429) denied++;
            assertEquals(5, checked.get()); assertEquals(1, denied);
        } finally { pool.shutdownNow(); }
    }
}
