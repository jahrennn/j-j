package com.jjlpg.trading.controller;

import com.jjlpg.trading.dto.CreateLoanRequest;
import com.jjlpg.trading.dto.LoanResponseDto;
import com.jjlpg.trading.dto.RecordPaymentRequest;
import com.jjlpg.trading.entity.LoanCategory;
import com.jjlpg.trading.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping
    public List<LoanResponseDto> getLoans(@RequestParam(required = false) LoanCategory category) {
        return loanService.getLoans(category);
    }

    @PostMapping
    public LoanResponseDto createOtherLoan(@Valid @RequestBody CreateLoanRequest request) {
        return loanService.createOtherLoan(request);
    }

    @PostMapping("/{id}/payments")
    public LoanResponseDto recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordPaymentRequest request) {
        return loanService.recordPayment(id, request);
    }
}
