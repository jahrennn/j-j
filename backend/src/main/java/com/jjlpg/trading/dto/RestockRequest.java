package com.jjlpg.trading.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RestockRequest(
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity,

        @NotNull(message = "Capital is required")
        @Min(value = 0, message = "Capital cannot be negative")
        BigDecimal capital
) {}
