package com.jjlpg.trading.dto;

import java.math.BigDecimal;
import java.util.List;

public record LoanResponseDto(
        Long id,
        String category,
        String borrowerName,
        String loanDate,
        String description,
        String itemsPurchased,
        BigDecimal totalAmount,
        BigDecimal amountPaid,
        BigDecimal remainingBalance,
        String status,
        String notes,
        Long saleId,
        List<LoanPaymentDto> payments
) {}
