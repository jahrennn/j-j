package com.jjlpg.trading.dto;

import java.math.BigDecimal;

public record ProductDto(
        String id,
        String name,
        String sku,
        String type,
        int stock,
        BigDecimal unitPrice,
        BigDecimal capital
) {
}
