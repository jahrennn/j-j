package com.jjlpg.trading.dto;

import java.math.BigDecimal;

public record SaleRecordDto(
        String id,
        String date,
        String transactionId,
        String item,
        String itemName,
        int quantity,
        BigDecimal totalAmount,
        BigDecimal capital,
        BigDecimal profit,
        String buyerName,
        String address
) {
}
