package com.jjlpg.trading.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.jjlpg.trading.entity.StockMovementType;

public record UpdateStockRequest(
        @NotNull(message = "New stock value is required")
        @Min(value = 0, message = "Stock cannot be negative")
        Integer stock,
        @NotNull(message = "Adjustment type is required")
        StockMovementType movementType,
        @NotBlank(message = "Reason is required")
        @Size(max = 500, message = "Reason must be 500 characters or fewer")
        String reason
) {}
