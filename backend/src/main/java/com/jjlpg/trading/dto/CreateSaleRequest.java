package com.jjlpg.trading.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateSaleRequest(
        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity,

        @jakarta.validation.constraints.NotBlank(message = "Buyer name is required")
        @jakarta.validation.constraints.Size(max = 255)
        String buyerName,

        String address,

        @NotNull(message = "Delivery method is required")
        @jakarta.validation.constraints.Pattern(regexp = "(?i)Pick up|Deliver", message = "Delivery method must be Pick up or Deliver")
        String deliveryMethod,

        @jakarta.validation.constraints.Pattern(regexp = "(?i)cash|utang", message = "Payment method must be Cash or Utang")
        String paymentMethod,

        @jakarta.validation.constraints.Digits(integer = 10, fraction = 2)
        @jakarta.validation.constraints.DecimalMin("0")
        BigDecimal downpayment
) {}
