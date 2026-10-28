package com.jjlpg.trading.repository;
import com.jjlpg.trading.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {}
