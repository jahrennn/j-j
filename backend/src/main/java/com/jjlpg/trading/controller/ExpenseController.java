package com.jjlpg.trading.controller;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.ExpenseCategory;
import com.jjlpg.trading.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/expenses")
public class ExpenseController {
    private final ExpenseService expenses;
    public ExpenseController(ExpenseService expenses) { this.expenses = expenses; }

    @GetMapping("/profit")
    public ExpenseProfitDto getProfit(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return expenses.getProfit(startDate, endDate);
    }

    @GetMapping
    public ExpensesResponseDto getExpenses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return expenses.getExpenses(startDate, endDate, category, page, size);
    }

    @PostMapping
    public ExpenseDto recordExpense(@Valid @RequestBody CreateExpenseRequest request, Authentication auth) {
        return expenses.recordExpense(request, auth.getName());
    }

    @PostMapping("/{id}/void")
    public ExpenseDto voidExpense(@PathVariable Long id, @Valid @RequestBody VoidExpenseRequest request,
                                 Authentication auth) {
        return expenses.voidExpense(id, request, auth.getName());
    }
}
