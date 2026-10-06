package com.jjlpg.trading.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateProductRequest(
        @NotBlank(message = "SKU is required")
        String sku,

        @NotBlank(message = "Name is required")
        String name,

        @NotNull(message = "Unit price is required")
        @jakarta.validation.constraints.DecimalMin(value = "0.00", message = "Unit price cannot be negative")
        BigDecimal unitPrice,

        @NotNull(message = "Capital is required")
        @jakarta.validation.constraints.DecimalMin(value = "0.00", message = "Capital cannot be negative")
        BigDecimal capital,

        // Older frontend builds include stock in product edits. Keep it only to
        // detect and reject an unlogged stock change during backend-first rollout.
        @Min(value = 0, message = "Stock cannot be negative")
        Integer stock
) {
    public UpdateProductRequest(String sku, String name, BigDecimal unitPrice, BigDecimal capital) {
        this(sku, name, unitPrice, capital, null);
    }
}
