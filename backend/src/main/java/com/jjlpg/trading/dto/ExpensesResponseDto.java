package com.jjlpg.trading.dto;

public record ExpensesResponseDto(ExpenseSummaryDto summary, PageResponseDto<ExpenseDto> records) {}
