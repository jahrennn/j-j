package com.jjlpg.trading.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RecordPaymentRequest(
        @NotNull(message = "Payment amount is required")
        @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
        @jakarta.validation.constraints.Digits(integer = 10, fraction = 2)
        BigDecimal amount,

        LocalDate paymentDate,

        @jakarta.validation.constraints.Size(max = 500)
        String notes,

        java.util.UUID requestId
) {}
