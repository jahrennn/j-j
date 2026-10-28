package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.LoginRequest;
import com.jjlpg.trading.dto.LoginResponse;
import com.jjlpg.trading.entity.User;
import com.jjlpg.trading.repository.UserRepository;
import com.jjlpg.trading.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public com.jjlpg.trading.dto.StaffDto current(String username) {
        User u = userRepository.findByUsername(username).filter(User::isEnabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable"));
        return new com.jjlpg.trading.dto.StaffDto(u.getId(), u.getUsername(), u.getRole(), true);
    }
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .filter(User::isEnabled)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid username or password."));

        String token = jwtService.generateToken(user.getUsername(), user.getTokenVersion(), user.getId());
        return new LoginResponse(token, user.getUsername(), user.getRole());
    }
}
