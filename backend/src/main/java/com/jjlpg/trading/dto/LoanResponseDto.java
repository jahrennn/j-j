package com.jjlpg.trading.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

public record LoanResponseDto(
        Long id,
        String category,
        String borrowerName,
        String loanDate,
        String description,
        String productPurchased,
        BigDecimal totalAmount,
        BigDecimal amountPaid,
        BigDecimal remainingBalance,
        String status,
        String notes,
        Long saleId,
        List<LoanPaymentDto> payments
) {
    // Temporary response alias for older frontend builds during rollout.
    @JsonProperty("itemsPurchased")
    public String legacyItemsPurchased() { return productPurchased; }
}
