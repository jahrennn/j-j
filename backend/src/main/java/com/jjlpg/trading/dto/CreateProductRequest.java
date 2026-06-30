package com.jjlpg.trading.dto;

import com.jjlpg.trading.entity.ItemType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateProductRequest(
        @NotBlank(message = "SKU is required")
        String sku,

        @NotBlank(message = "Name is required")
        String name,

        @NotNull(message = "Item type is required")
        ItemType type,

        @NotNull(message = "Initial stock is required")
        @Min(value = 0, message = "Stock cannot be negative")
        Integer stock,

        @NotNull(message = "Unit price is required")
        @Min(value = 0, message = "Unit price cannot be negative")
        BigDecimal unitPrice,

        @NotNull(message = "Capital is required")
        @Min(value = 0, message = "Capital cannot be negative")
        BigDecimal capital
) {}
