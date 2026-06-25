package com.jjlpg.trading.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteSaleRequest(
        @NotBlank(message = "Password is required")
        String password
) {}
