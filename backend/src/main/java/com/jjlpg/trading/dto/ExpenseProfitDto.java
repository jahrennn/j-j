package com.jjlpg.trading.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseProfitDto(LocalDate startDate, LocalDate endDate, BigDecimal grossProfit,
                               BigDecimal operatingExpenses, BigDecimal netProfit) {}
