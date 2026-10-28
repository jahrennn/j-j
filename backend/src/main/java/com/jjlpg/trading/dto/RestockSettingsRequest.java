package com.jjlpg.trading.dto;
import jakarta.validation.constraints.*;
public record RestockSettingsRequest(
        @NotNull @Min(0) @Max(1000000) Integer minimumStock,
        @NotNull @Min(0) @Max(365) Integer leadTimeDays,
        @NotNull @Min(1) @Max(365) Integer coverageDays) {}
