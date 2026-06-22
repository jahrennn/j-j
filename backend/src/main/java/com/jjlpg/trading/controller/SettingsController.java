package com.jjlpg.trading.controller;

import com.jjlpg.trading.dto.SettingsResponseDto;
import com.jjlpg.trading.dto.UpdateSettingsRequest;
import com.jjlpg.trading.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public SettingsResponseDto getSettings(Authentication authentication) {
        return settingsService.getSettings(authentication.getName());
    }

    @PutMapping
    public SettingsResponseDto updateSettings(
            Authentication authentication,
            @Valid @RequestBody UpdateSettingsRequest request) {
        return settingsService.updateSettings(authentication.getName(), request);
    }
}
