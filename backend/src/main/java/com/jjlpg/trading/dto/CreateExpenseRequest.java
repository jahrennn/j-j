package com.jjlpg.trading.dto;

import com.jjlpg.trading.entity.ExpenseCategory;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateExpenseRequest(
        @NotNull UUID requestId,
        @NotNull(message = "Expense date is required") LocalDate expenseDate,
        @NotNull(message = "Category is required") ExpenseCategory category,
        @NotBlank(message = "Description is required") @Size(max = 255) String description,
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @Size(max = 255) String paidTo,
        @Size(max = 500) String notes
) {}
