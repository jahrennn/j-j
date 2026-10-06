package com.jjlpg.trading.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "tank_exchanges")
public class TankExchange {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;
    @Column(name = "customer_tank_product_id")
    private Long customerTankProductId;
    @Column(name = "supplied_tank_product_id")
    private Long suppliedTankProductId;
    @Column(name = "customer_tank_name", nullable = false)
    private String customerTankName;
    @Column(name = "customer_tank_sku", nullable = false, length = 20)
    private String customerTankSku;
    @Column(name = "supplied_tank_name", nullable = false)
    private String suppliedTankName;
    @Column(name = "supplied_tank_sku", nullable = false, length = 20)
    private String suppliedTankSku;
    @Column(nullable = false)
    private Integer quantity;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public Sale getSale() { return sale; }
    public void setSale(Sale sale) { this.sale = sale; }
    public Long getCustomerTankProductId() { return customerTankProductId; }
    public void setCustomerTankProductId(Long id) { this.customerTankProductId = id; }
    public Long getSuppliedTankProductId() { return suppliedTankProductId; }
    public void setSuppliedTankProductId(Long id) { this.suppliedTankProductId = id; }
    public String getCustomerTankName() { return customerTankName; }
    public void setCustomerTankName(String name) { this.customerTankName = name; }
    public String getCustomerTankSku() { return customerTankSku; }
    public void setCustomerTankSku(String sku) { this.customerTankSku = sku; }
    public String getSuppliedTankName() { return suppliedTankName; }
    public void setSuppliedTankName(String name) { this.suppliedTankName = name; }
    public String getSuppliedTankSku() { return suppliedTankSku; }
    public void setSuppliedTankSku(String sku) { this.suppliedTankSku = sku; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Instant getCreatedAt() { return createdAt; }
}
