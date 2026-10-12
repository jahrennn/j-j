package com.jjlpg.trading.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VoidExpenseRequest(
        @NotBlank(message = "A reason is required to void an expense") @Size(max = 500) String reason
) {}
