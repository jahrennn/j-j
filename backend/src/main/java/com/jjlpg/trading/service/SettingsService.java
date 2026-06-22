package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.SettingsResponseDto;
import com.jjlpg.trading.dto.UpdateSettingsRequest;
import com.jjlpg.trading.entity.BusinessSettings;
import com.jjlpg.trading.entity.User;
import com.jjlpg.trading.repository.BusinessSettingsRepository;
import com.jjlpg.trading.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SettingsService {

    private final BusinessSettingsRepository settingsRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SettingsService(
            BusinessSettingsRepository settingsRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public SettingsResponseDto getSettings(String currentUsername) {
        BusinessSettings settings = getSettingsEntity();
        return new SettingsResponseDto(
                settings.getBusinessName(),
                settings.getContactNumber(),
                settings.getAddress(),
                currentUsername);
    }

    @Transactional
    public SettingsResponseDto updateSettings(String currentUsername, UpdateSettingsRequest request) {
        BusinessSettings settings = getSettingsEntity();
        settings.setBusinessName(request.businessName());
        settings.setContactNumber(request.contactNumber());
        settings.setAddress(request.address());

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        if (request.username() != null && !request.username().isBlank()
                && !request.username().equals(currentUsername)) {
            if (userRepository.existsByUsername(request.username())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken.");
            }
            user.setUsername(request.username());
        }

        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }

        userRepository.save(user);
        settingsRepository.save(settings);

        return new SettingsResponseDto(
                settings.getBusinessName(),
                settings.getContactNumber(),
                settings.getAddress(),
                user.getUsername());
    }

    private BusinessSettings getSettingsEntity() {
        return settingsRepository.findById((short) 1)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Business settings not found."));
    }
}
