package com.jjlpg.trading.dto;
import java.math.BigDecimal;
public record ReplenishmentDto(int minimumStock, int leadTimeDays, int coverageDays,
        long unitsSold, int observationDays, BigDecimal averageDailySales, BigDecimal daysRemaining,
        long reorderPoint, long targetStock, long suggestedQuantity, boolean needsReorder) {}
