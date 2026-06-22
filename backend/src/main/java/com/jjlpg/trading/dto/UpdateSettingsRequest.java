package com.jjlpg.trading.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateSettingsRequest(
        @NotBlank String businessName,
        @NotBlank String contactNumber,
        @NotBlank String address,
        String username,
        String newPassword
) {
}
