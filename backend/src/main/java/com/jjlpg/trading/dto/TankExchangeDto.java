package com.jjlpg.trading.dto;

import java.time.Instant;

public record TankExchangeDto(
        Long id, String saleId, String transactionId, String date, String buyerName,
        int quantity, String customerTankName, String customerTankSku,
        String suppliedTankName, String suppliedTankSku, Instant createdAt
) {}
