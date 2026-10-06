package com.jjlpg.trading.dto;

import jakarta.validation.constraints.NotNull;

public record TankExchangeRequest(
        @NotNull Long customerTankProductId,
        @NotNull Long suppliedTankProductId
) {}
