package com.jjlpg.trading.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "expenses")
public class Expense {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "request_id", nullable = false, unique = true)
    private UUID requestId;
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ExpenseCategory category;
    @Column(nullable = false)
    private String description;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
    @Column(name = "paid_to")
    private String paidTo;
    @Column(length = 500)
    private String notes;
    @Column(nullable = false, length = 20)
    private String status;
    @Column(name = "created_by", nullable = false)
    private String createdBy;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "void_reason", length = 500)
    private String voidReason;
    @Column(name = "voided_by")
    private String voidedBy;
    @Column(name = "voided_at")
    private Instant voidedAt;

    public Long getId() { return id; }
    public UUID getRequestId() { return requestId; }
    public LocalDate getExpenseDate() { return expenseDate; }
    public ExpenseCategory getCategory() { return category; }
    public String getDescription() { return description; }
    public BigDecimal getAmount() { return amount; }
    public String getPaidTo() { return paidTo; }
    public String getNotes() { return notes; }
    public String getStatus() { return status; }
    public String getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public String getVoidReason() { return voidReason; }
    public String getVoidedBy() { return voidedBy; }
    public Instant getVoidedAt() { return voidedAt; }

    public void voidEntry(String reason, String actor) {
        status = "VOIDED";
        voidReason = reason;
        voidedBy = actor;
        voidedAt = Instant.now();
    }
}
