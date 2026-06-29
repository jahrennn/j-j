package com.jjlpg.trading.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateSaleRequest(
        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity,

        @NotNull(message = "Buyer name is required")
        String buyerName,

        String address,

        @NotNull(message = "Delivery method is required")
        String deliveryMethod
) {}
