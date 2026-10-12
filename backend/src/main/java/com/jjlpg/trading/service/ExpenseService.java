package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.ExpenseRepository;
import com.jjlpg.trading.repository.SaleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
public class ExpenseService {
    private final ExpenseRepository expenses;
    private final SaleRepository sales;

    public ExpenseService(ExpenseRepository expenses, SaleRepository sales) {
        this.expenses = expenses;
        this.sales = sales;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ExpenseProfitDto getProfit(LocalDate startDate, LocalDate endDate) {
        if (startDate == null && endDate == null) {
            var month = java.time.YearMonth.now(java.time.ZoneId.of("Asia/Manila"));
            startDate = month.atDay(1);
            endDate = month.atEndOfMonth();
        }
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Provide both dates, with start date on or before end date");
        }
        var grossProfit = sales.sumProfit(startDate, endDate);
        var cost = expenses.summarize(startDate, endDate, List.of(ExpenseCategory.values())).totalAmount();
        return new ExpenseProfitDto(startDate, endDate, grossProfit, cost, grossProfit.subtract(cost));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ExpensesResponseDto getExpenses(LocalDate startDate, LocalDate endDate,
                                           ExpenseCategory category, int page, int size) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must be on or before end date");
        }
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Page must be non-negative and size must be 1 to 100");
        }
        List<ExpenseCategory> categories = category == null ? List.of(ExpenseCategory.values()) : List.of(category);
        var records = expenses.findByFilters(startDate, endDate, categories,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("expenseDate"), Sort.Order.desc("id"))));
        return new ExpensesResponseDto(expenses.summarize(startDate, endDate, categories),
                PageResponseDto.from(records.map(this::toDto)));
    }

    @Transactional
    public ExpenseDto recordExpense(CreateExpenseRequest request, String actor) {
        String paidTo = optionalText(request.paidTo());
        String notes = optionalText(request.notes());
        String description = request.description().trim();
        if (request.category() == ExpenseCategory.SALARY && paidTo == null) {
            throw new IllegalArgumentException("Enter the delivery person or employee paid for a salary expense");
        }
        expenses.insertOnce(request.requestId(), request.expenseDate(), request.category().name(),
                description, request.amount(), paidTo, notes, actor);
        Expense saved = expenses.findByRequestId(request.requestId()).orElseThrow();
        if (!saved.getExpenseDate().equals(request.expenseDate()) || saved.getCategory() != request.category()
                || !saved.getDescription().equals(description) || saved.getAmount().compareTo(request.amount()) != 0
                || !Objects.equals(saved.getPaidTo(), paidTo) || !Objects.equals(saved.getNotes(), notes)
                || !saved.getCreatedBy().equals(actor)) {
            throw new IllegalStateException("This expense request was already saved with different details. Reload expenses before adding another entry.");
        }
        return toDto(saved);
    }

    @Transactional
    public ExpenseDto voidExpense(Long id, VoidExpenseRequest request, String actor) {
        Expense expense = expenses.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!"VOIDED".equals(expense.getStatus())) {
            expense.voidEntry(request.reason().trim(), actor);
        }
        return toDto(expenses.saveAndFlush(expense));
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ExpenseDto toDto(Expense e) {
        return new ExpenseDto(e.getId(), e.getExpenseDate(), e.getCategory().name(), e.getDescription(),
                e.getAmount(), e.getPaidTo(), e.getNotes(), e.getStatus(), e.getCreatedBy(), e.getCreatedAt(),
                e.getVoidReason(), e.getVoidedBy(), e.getVoidedAt());
    }
}
