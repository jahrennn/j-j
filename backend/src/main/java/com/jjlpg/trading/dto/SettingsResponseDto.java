package com.jjlpg.trading.dto;

public record SettingsResponseDto(
        String businessName,
        String contactNumber,
        String address,
        String username
) {
}
