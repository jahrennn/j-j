package com.jjlpg.trading.entity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
@Entity @Table(name = "audit_events")
public class AuditEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String actor;
    @Column(nullable = false, length = 50) private String action;
    @Column(name = "entity_type", nullable = false, length = 40) private String entityType;
    @Column(name = "entity_id", nullable = false, length = 64) private String entityId;
    @Column(nullable = false, columnDefinition = "TEXT") private String details;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    public Long getId() { return id; }
    public String getActor() { return actor; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public String getEntityId() { return entityId; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
    public AuditEvent() {}
    public AuditEvent(String actor, String action, String type, String entityId, String details) {
        this.actor = actor; this.action = action; this.entityType = type; this.entityId = entityId; this.details = details;
    }
}
