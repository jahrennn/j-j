package com.jjlpg.trading.service;
import com.jjlpg.trading.entity.AuditEvent;
import com.jjlpg.trading.repository.AuditEventRepository;
import com.jjlpg.trading.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
@Service
public class AuditService {
    private final AuditEventRepository repository;
    public AuditService(AuditEventRepository repository) { this.repository = repository; }
    @Transactional
    public void record(String action, String type, Object id, String details) {
        repository.save(new AuditEvent(Actor.username(), action, type, String.valueOf(id), details));
    }
    @Transactional(readOnly = true)
    public Page<AuditEvent> getEvents(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid page or size");
        return repository.findAll(PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
    }
}
