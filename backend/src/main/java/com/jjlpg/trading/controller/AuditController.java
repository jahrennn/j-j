package com.jjlpg.trading.controller;
import com.jjlpg.trading.dto.PageResponseDto;
import com.jjlpg.trading.entity.AuditEvent;
import com.jjlpg.trading.service.AuditService;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/audit")
public class AuditController {
    private final AuditService audit;
    public AuditController(AuditService audit) { this.audit = audit; }
    @GetMapping public PageResponseDto<AuditEvent> events(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) { return PageResponseDto.from(audit.getEvents(page, size)); }
}
