package com.jjlpg.trading.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateStockRequest(
        @NotNull(message = "New stock value is required")
        @Min(value = 0, message = "Stock cannot be negative")
        Integer stock
) {}
