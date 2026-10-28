package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Service
public class LoginAttemptService {
    private static final int MAX_FAILURES = 5;
    private static final int MAX_TRACKED_ACCOUNTS = 10_000;
    private static final long WINDOW_MS = Duration.ofMinutes(15).toMillis();
    private record Failures(int count, long expiresAt) {}
    private final ConcurrentHashMap<String, Failures> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    @Autowired
    public LoginAttemptService() { this(Clock.systemUTC()); }
    public LoginAttemptService(Clock clock) { this.clock = clock; }

    public LoginResponse authenticate(String username, Supplier<LoginResponse> authenticate) {
        String key = username.trim().toLowerCase(Locale.ROOT);
        long now = clock.millis();
        failures.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
        if (failures.size() >= MAX_TRACKED_ACCOUNTS && !failures.containsKey(key)) {
            throw throttled(60);
        }
        // Compute serializes attempts for this account, including authentication.
        // Other accounts have independent counters. Returning null on success
        // resets the counter atomically, even with simultaneous requests.
        class Outcome { LoginResponse response; RuntimeException error; }
        Outcome outcome = new Outcome();
        failures.compute(key, (ignored, previous) -> {
            long currentTime = clock.millis();
            Failures current = previous != null && previous.expiresAt() > currentTime ? previous : null;
            if (current != null && current.count() >= MAX_FAILURES) {
                outcome.error = throttled(Math.max(1, (current.expiresAt() - currentTime + 999) / 1000));
                return current;
            }
            try {
                outcome.response = authenticate.get();
                return null;
            } catch (RuntimeException error) {
                outcome.error = error;
                if (error instanceof ResponseStatusException status && status.getStatusCode().value() == 401) {
                    int count = current == null ? 1 : current.count() + 1;
                    long expiresAt = current == null || count == MAX_FAILURES
                            ? currentTime + WINDOW_MS : current.expiresAt();
                    return new Failures(count, expiresAt);
                }
                // Validation, network, and server errors do not use password retries.
                return current;
            }
        });
        if (outcome.error != null) throw outcome.error;
        return outcome.response;
    }

    private ResponseStatusException throttled(long seconds) {
        long minutes = (seconds + 59) / 60;
        String message = "Too many failed login attempts for this account. Please try again in "
                + minutes + (minutes == 1 ? " minute." : " minutes.");
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message) {
            @Override public HttpHeaders getHeaders() {
                HttpHeaders headers = new HttpHeaders();
                headers.set("Retry-After", Long.toString(seconds));
                return headers;
            }
        };
    }
}
