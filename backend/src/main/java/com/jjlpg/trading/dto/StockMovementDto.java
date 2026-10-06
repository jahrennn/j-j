package com.jjlpg.trading.dto;

import java.time.Instant;

public record StockMovementDto(
        Long id,
        Long productId,
        String productSku,
        String productName,
        String movementType,
        int quantityChange,
        int stockBefore,
        int stockAfter,
        String reason,
        String actor,
        String transactionId,
        Instant createdAt
) {}
