package com.jjlpg.trading.dto;

import java.math.BigDecimal;

public record LoanPaymentDto(
        Long id,
        BigDecimal amount,
        String paymentDate,
        String notes,
        String createdAt
) {}
