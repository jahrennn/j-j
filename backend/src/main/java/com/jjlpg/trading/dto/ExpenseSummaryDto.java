package com.jjlpg.trading.dto;

import java.math.BigDecimal;

public record ExpenseSummaryDto(BigDecimal totalAmount, BigDecimal fuelAmount,
                                BigDecimal salaryAmount, BigDecimal otherAmount, long recordedCount) {}
