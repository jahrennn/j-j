package com.jjlpg.trading.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateLoanRequest(
        @NotBlank(message = "Borrower name is required")
        @jakarta.validation.constraints.Size(max = 255)
        String borrowerName,

        LocalDate loanDate,

        @NotBlank(message = "Description is required")
        @jakarta.validation.constraints.Size(max = 500)
        String description,

        @NotNull(message = "Total amount is required")
        @DecimalMin(value = "0.01", message = "Total amount must be greater than zero")
        @jakarta.validation.constraints.Digits(integer = 10, fraction = 2)
        BigDecimal totalAmount,

        @jakarta.validation.constraints.Digits(integer = 10, fraction = 2)
        @jakarta.validation.constraints.DecimalMin("0")
        BigDecimal downpayment,

        @jakarta.validation.constraints.Size(max = 500)
        String notes
) {}
