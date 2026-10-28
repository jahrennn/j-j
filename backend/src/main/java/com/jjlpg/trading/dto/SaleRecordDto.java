package com.jjlpg.trading.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record SaleRecordDto(
        String id,
        String date,
        String transactionId,
        String productName,
        int quantity,
        BigDecimal totalAmount,
        BigDecimal capital,
        BigDecimal profit,
        String buyerName,
        String address,
        String deliveryMethod,
        String paymentMethod,
        BigDecimal downpayment,
        String productId,
        Integer remainingStock,
        String recordedBy
) {
    public SaleRecordDto(String id, String date, String transactionId, String productName, int quantity,
                         BigDecimal totalAmount, BigDecimal capital, BigDecimal profit, String buyerName,
                         String address, String deliveryMethod, String paymentMethod, BigDecimal downpayment,
                         String productId, Integer remainingStock) {
        this(id, date, transactionId, productName, quantity, totalAmount, capital, profit, buyerName,
                address, deliveryMethod, paymentMethod, downpayment, productId, remainingStock, null);
    }
    public SaleRecordDto(String id, String date, String transactionId, String productName, int quantity,
                         BigDecimal totalAmount, BigDecimal capital, BigDecimal profit, String buyerName,
                         String address, String deliveryMethod, String paymentMethod, BigDecimal downpayment) {
        this(id, date, transactionId, productName, quantity, totalAmount, capital, profit, buyerName,
                address, deliveryMethod, paymentMethod, downpayment, null, null);
    }

    public SaleRecordDto withRemainingStock(Integer stock) {
        return new SaleRecordDto(id, date, transactionId, productName, quantity, totalAmount, capital, profit,
                buyerName, address, deliveryMethod, paymentMethod, downpayment, productId, stock, recordedBy);
    }
    // Temporary response aliases keep an already-open older frontend working during rollout.
    @JsonProperty("itemName")
    public String legacyItemName() { return productName; }

    @JsonProperty("item")
    public String legacyItemCategory() { return "LPG Tank"; }
}
