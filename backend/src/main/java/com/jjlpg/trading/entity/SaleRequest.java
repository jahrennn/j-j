package com.jjlpg.trading.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "sale_requests")
public class SaleRequest {
    @Id @Column(name = "request_id")
    private UUID requestId;
    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;
    @Column(name = "sale_id")
    private Long saleId;

    public UUID getRequestId() { return requestId; }
    public String getRequestHash() { return requestHash; }
    public Long getSaleId() { return saleId; }
    public void setSaleId(Long saleId) { this.saleId = saleId; }
}
