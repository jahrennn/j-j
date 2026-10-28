package com.jjlpg.trading.controller;

import com.jjlpg.trading.dto.LoginRequest;
import com.jjlpg.trading.dto.LoginResponse;
import com.jjlpg.trading.service.AuthService;
import com.jjlpg.trading.service.LoginAttemptService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final LoginAttemptService attempts;

    public AuthController(AuthService authService, LoginAttemptService attempts) {
        this.authService = authService;
        this.attempts = attempts;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse loginResponse = attempts.authenticate(request.username(), () -> authService.login(request));

        ResponseCookie springCookie = ResponseCookie.from("jwt", loginResponse.token())
                .httpOnly(true)
                .secure(true) // Must be true when SameSite=None
                .path("/")
                .maxAge(3600) // 1 hour
                .sameSite("None") // Required for cross-site requests (Vercel -> Render)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, springCookie.toString())
                .body(loginResponse);
    }

    @org.springframework.web.bind.annotation.GetMapping("/me")
    public com.jjlpg.trading.dto.StaffDto me(org.springframework.security.core.Authentication auth) {
        return authService.current(auth.getName());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie springCookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0) // immediately expire
                .sameSite("None") // Required for cross-site requests (Vercel -> Render)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, springCookie.toString())
                .build();
    }
}
