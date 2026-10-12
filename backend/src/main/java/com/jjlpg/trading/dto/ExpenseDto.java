package com.jjlpg.trading.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ExpenseDto(Long id, LocalDate expenseDate, String category, String description,
                         BigDecimal amount, String paidTo, String notes, String status,
                         String createdBy, Instant createdAt, String voidReason,
                         String voidedBy, Instant voidedAt) {}
