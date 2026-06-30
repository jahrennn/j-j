package com.jjlpg.trading.dto;

import java.math.BigDecimal;

public record SalesSummaryDto(
        BigDecimal totalRevenue,
        long totalOrders,
        BigDecimal averageTransactionValue,
        BigDecimal totalProfit
) {
}
