package com.jjlpg.trading.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record ProductDto(
        String id,
        String name,
        String sku,
        int stock,
        BigDecimal unitPrice,
        BigDecimal capital
) {
    // Temporary response alias for older frontend builds during backend-first deployment.
    @JsonProperty("type")
    public String legacyType() { return "LPG Tank"; }
}
