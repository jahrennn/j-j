package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class LoanDatabaseTest {
    @Autowired LoanService loans;
    @Autowired SalesService sales;
    @Autowired ProductRepository products;
    @Autowired LoanRepository loanRepository;
    @Autowired SaleRepository saleRepository;
    final LocalDate date = LocalDate.of(2026, 10, 1);
    BigDecimal money(String value) { return new BigDecimal(value); }
    LoanResponseDto newLoan() {
        return loans.createOtherLoan(new CreateLoanRequest("Integration borrower", date, "Cash loan", money("100.00"), null, null));
    }
    @Test void concurrentPaymentsCannotOverpayOrLoseBalanceUpdates() throws Exception {
        var loan = newLoan();
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> task = () -> {
            start.await();
            try {
                loans.recordPayment(loan.id(), new RecordPaymentRequest(money("60.00"), date, null, UUID.randomUUID()));
                return true;
            } catch (IllegalArgumentException expected) { return false; }
        };
        try {
            var first = pool.submit(task); var second = pool.submit(task); start.countDown();
            assertNotEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
            var current = loans.getLoans(LoanCategory.OTHER).stream().filter(l -> l.id().equals(loan.id())).findFirst().orElseThrow();
            assertEquals(money("60.00"), current.amountPaid());
            assertEquals(money("40.00"), current.remainingBalance());
            assertEquals(1, current.payments().size());
        } finally { pool.shutdownNow(); }
    }
    @Test void retriedFinalPaymentIsLoggedOnceAndPaidLoanRemainsVisible() {
        var loan = newLoan();
        var request = new RecordPaymentRequest(money("100.00"), date, "Settlement", UUID.randomUUID());
        loans.recordPayment(loan.id(), request);
        var retry = loans.recordPayment(loan.id(), request);
        assertEquals("PAID", retry.status());
        assertEquals(1, retry.payments().size());
        assertTrue(loans.getLoans(LoanCategory.OTHER).stream().anyMatch(l -> l.id().equals(loan.id())));
    }
    Product product() {
        Product product = new Product();
        product.setSku("TEST-" + UUID.randomUUID().toString().substring(0, 12)); product.setName("Integration LPG");
        product.setType(ItemType.LPG_REFILL); product.setStock(10);
        product.setUnitPrice(money("50.00")); product.setCapital(money("30.00"));
        return products.save(product);
    }
    @Test void creditSaleCreatesLoanAndDeductsStockAtomically() {
        Product product = product();
        var sale = sales.recordSale(new CreateSaleRequest(product.getId(), 2, "Customer", "Test address", "Deliver", "utang", money("20.00")));
        var loan = loanRepository.findBySaleId(Long.valueOf(sale.id())).orElseThrow();
        assertEquals(money("100.00"), loan.getTotalAmount());
        assertEquals(money("80.00"), loan.getRemainingBalance());
        assertEquals(8, products.findById(product.getId()).orElseThrow().getStock());
        assertEquals("Deliver", sale.deliveryMethod());
        assertEquals("Test address", sale.address());
        var saleDate = LocalDate.now(java.time.ZoneId.of("Asia/Manila"));
        assertEquals("Deliver", sales.getSales(saleDate, saleDate).records().stream()
                .filter(record -> record.id().equals(sale.id())).findFirst().orElseThrow().deliveryMethod());
    }
    @Test void invalidCreditSaleRollsBackSaleAndInventory() {
        Product product = product(); long before = saleRepository.count();
        assertThrows(IllegalArgumentException.class, () -> sales.recordSale(new CreateSaleRequest(product.getId(), 2, "Customer", "", "Pick up", "Utang", money("100.01"))));
        assertEquals(10, products.findById(product.getId()).orElseThrow().getStock());
        assertEquals(before, saleRepository.count());
    }
    @Test void cashSaleDoesNotCreateLoanAndIgnoresStaleDownpayment() {
        Product product = product();
        var sale = sales.recordSale(new CreateSaleRequest(product.getId(), 1, "Customer", "", "Pick up", null, money("20.00")));
        assertEquals("CASH", sale.paymentMethod());
        assertEquals("Pick up", sale.deliveryMethod());
        assertEquals(0, sale.downpayment().signum());
        assertTrue(loanRepository.findBySaleId(Long.valueOf(sale.id())).isEmpty());
    }
    @Test void linkedSaleCannotBeDeletedDirectlyInDatabase() {
        Product product = product();
        var sale = sales.recordSale(new CreateSaleRequest(product.getId(), 1, "Customer", "", "Pick up", "Utang", null));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> saleRepository.deleteById(Long.valueOf(sale.id())));
        assertTrue(loanRepository.findBySaleId(Long.valueOf(sale.id())).isPresent());
    }
}
