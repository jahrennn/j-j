package com.jjlpg.trading.dto;

import java.math.BigDecimal;

public record SaleRecordDto(
        String id,
        String date,
        String transactionId,
        String item,
        int quantity,
        BigDecimal totalAmount
) {
}
