package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class LoanDueDateDatabaseTest {
    @Autowired LoanService loans;
    @Autowired SalesService sales;
    @Autowired ProductRepository products;
    @Autowired LoanRepository loanRepository;
    @Autowired SaleRepository saleRepository;
    @Autowired JdbcTemplate jdbc;
    final LocalDate date = LocalDate.now(java.time.ZoneId.of("Asia/Manila"));
    BigDecimal money(String n) { return new BigDecimal(n); }
    String name() { return "Credit test " + UUID.randomUUID(); }
    LoanResponseDto loan(String name, String amount, String paid, LocalDate due) {
        return loans.createOtherLoan(new CreateLoanRequest(name, date, "Credit control test", money(amount), money(paid), null, due));
    }
    Product product() {
        var p = new Product(); p.setSku("CREDIT-" + UUID.randomUUID().toString().substring(0, 12));
        p.setName("Credit test LPG"); p.setType(ItemType.LPG_REFILL); p.setStock(10);
        p.setUnitPrice(money("100.00")); p.setCapital(money("50.00"));
        return products.save(p);
    }
    @Test void historicalCreditLimitsCannotBlockLoansOrSales() {
        String name = name();
        jdbc.update("INSERT INTO credit_customers(name, name_key, credit_limit) VALUES (?, lower(?), 0)", name, name);
        var other = loan(name, "1000.00", "0.00", date.plusDays(1));
        assertEquals(money("1000.00"), other.remainingBalance());
        assertNull(jdbc.queryForObject("SELECT customer_id FROM loans WHERE id = ?", Long.class, other.id()));
        Product p = product();
        var sale = sales.recordSale(new CreateSaleRequest(p.getId(), 1, name, "", "Pick up", "Utang", null,
                null, UUID.randomUUID(), date.plusDays(2)));
        var lpg = loanRepository.findBySaleId(Long.valueOf(sale.id())).orElseThrow();
        assertEquals(money("100.00"), lpg.getRemainingBalance());
        assertEquals(date.plusDays(2), lpg.getDueDate());
        assertEquals(9, products.findById(p.getId()).orElseThrow().getStock());
    }
    @Test void dateChangesAndDatabaseConstraintsPreserveBalances() {
        var original = loan(name(), "100.00", "0.00", date);
        var updated = loans.updateDueDate(original.id(), new UpdateLoanDueDateRequest(date.plusDays(3)));
        assertEquals(date.plusDays(3).toString(), updated.dueDate());
        assertEquals(original.remainingBalance(), updated.remainingBalance());
        assertNull(loans.updateDueDate(original.id(), new UpdateLoanDueDateRequest(null)).dueDate());
        assertThrows(IllegalArgumentException.class, () -> loans.updateDueDate(original.id(), new UpdateLoanDueDateRequest(date.minusDays(1))));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update("UPDATE loans SET due_date = loan_date - 1 WHERE id = ?", original.id()));
        assertEquals(Boolean.TRUE, jdbc.queryForObject("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.credit_customers'::regclass", Boolean.class));
    }
    @Test void saleRetriesRetainDueDateAndChangedDateCannotReuseRequest() {
        String name = name(); Product p = product(); UUID id = UUID.randomUUID();
        var request = new CreateSaleRequest(p.getId(), 1, name, "", "Pick up", "Utang", null, null, id, date.plusDays(2));
        var first = sales.recordSale(request); var retry = sales.recordSale(request);
        assertEquals(first.id(), retry.id());
        assertEquals(9, products.findById(p.getId()).orElseThrow().getStock());
        assertThrows(IllegalStateException.class, () -> sales.recordSale(new CreateSaleRequest(p.getId(), 1, name, "", "Pick up", "Utang", null, null, id, date.plusDays(3))));
    }
}
