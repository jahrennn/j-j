package com.jjlpg.trading.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record RestockRequest(
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity,

        @NotNull(message = "Capital is required")
        @DecimalMin(value = "0.00", message = "Capital cannot be negative")
        BigDecimal capital,

        @Size(max = 500, message = "Note must be 500 characters or fewer")
        String note
) {}
