package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class SalesStockDatabaseTest {
    @Autowired SalesService sales;
    @Autowired InventoryService inventory;
    @Autowired StockMovementService movements;
    @Autowired ProductRepository products;
    @Autowired SaleRepository saleRecords;
    @Autowired SaleRequestRepository requests;
    @Autowired LoanRepository loans;

    Product product(int stock) {
        Product p = new Product();
        p.setSku("ST-" + UUID.randomUUID().toString().substring(0, 12));
        p.setName("Stock regression tank");
        p.setType(ItemType.LPG_TANK);
        p.setStock(stock);
        p.setUnitPrice(new BigDecimal("1000.00"));
        p.setCapital(new BigDecimal("700.00"));
        return products.saveAndFlush(p);
    }

    CreateSaleRequest request(Product p, int qty, String method, String payment, UUID id) {
        return new CreateSaleRequest(p.getId(), qty, "Stock test buyer", "Delivery address",
                method, payment, new BigDecimal("0.00"), null, id);
    }

    int stock(Product p) { return products.findById(p.getId()).orElseThrow().getStock(); }

    @Test void stock94Becomes93ForCashCreditPickupAndDelivery() {
        for (String method : new String[]{"Pick up", "Deliver"}) {
            for (String payment : new String[]{"Cash", "Utang"}) {
                Product p = product(94);
                Product other = product(94);
                var sale = sales.recordSale(request(p, 1, method, payment, UUID.randomUUID()));
                assertEquals(93, stock(p));
                assertEquals(93, sale.remainingStock());
                assertEquals(p.getId().toString(), sale.productId());
                assertEquals(94, stock(other));
                assertTrue(saleRecords.findById(Long.valueOf(sale.id())).isPresent());
                assertEquals(payment.equals("Utang"), loans.findBySaleId(Long.valueOf(sale.id())).isPresent());
                var history = movements.getMovements(p.getId(), 0, 10).getContent();
                assertEquals(1, history.size());
                assertEquals(94, history.getFirst().stockBefore());
                assertEquals(93, history.getFirst().stockAfter());
                assertEquals(sale.transactionId(), history.getFirst().transactionId());
                assertEquals(93, inventory.getInventory().products().stream()
                        .filter(row -> row.id().equals(p.getId().toString())).findFirst().orElseThrow().stock());
            }
        }
    }

    @Test void exchangeAndMultipleQuantityDeductOnlyTheSuppliedProduct() {
        Product supplied = product(94);
        Product received = product(8);
        var sale = sales.recordSale(new CreateSaleRequest(supplied.getId(), 3, "Buyer", "", "Pick up", "Cash",
                null, new TankExchangeRequest(received.getId(), supplied.getId()), UUID.randomUUID()));
        assertEquals(91, stock(supplied));
        assertEquals(91, sale.remainingStock());
        assertEquals(8, stock(received));
        assertEquals(-3, movements.getMovements(supplied.getId(), 0, 10).getContent().getFirst().quantityChange());
    }

    @Test void failedSaleRollsBackStockHistoryAndRequestClaim() {
        Product p = product(94);
        UUID id = UUID.randomUUID();
        long count = saleRecords.count();
        var invalid = new CreateSaleRequest(p.getId(), 1, "Buyer", "", "Pick up", "Utang",
                new BigDecimal("1000.01"), null, id);
        assertThrows(IllegalArgumentException.class, () -> sales.recordSale(invalid));
        assertEquals(94, stock(p));
        assertEquals(count, saleRecords.count());
        assertFalse(requests.existsById(id));
        assertTrue(movements.getMovements(p.getId(), 0, 10).isEmpty());
        sales.recordSale(request(p, 1, "Pick up", "Cash", id));
        assertEquals(93, stock(p));
    }

    @Test void insufficientStockCannotLeaveAnOrderOrRequest() {
        Product p = product(1);
        UUID id = UUID.randomUUID();
        long count = saleRecords.count();
        assertThrows(IllegalArgumentException.class, () -> sales.recordSale(request(p, 2, "Deliver", "Cash", id)));
        assertEquals(1, stock(p));
        assertEquals(count, saleRecords.count());
        assertFalse(requests.existsById(id));
    }

    @Test void retryAfterPriceChangeReturnsOriginalSaleWithoutDeductingAgain() {
        Product p = product(94);
        var request = request(p, 1, "Deliver", "Utang", UUID.randomUUID());
        var first = sales.recordSale(request);
        inventory.updateProduct(p.getId(), new UpdateProductRequest(p.getSku(), p.getName(),
                new BigDecimal("1200.00"), new BigDecimal("800.00")));
        sales.recordSale(request(p, 1, "Pick up", "Cash", UUID.randomUUID()));
        var retry = sales.recordSale(request);
        assertEquals(first.id(), retry.id());
        assertEquals(first.totalAmount(), retry.totalAmount());
        assertEquals(first.capital(), retry.capital());
        assertEquals(92, stock(p));
        assertEquals(92, retry.remainingStock());
        assertEquals(2, movements.getMovements(p.getId(), 0, 10).getTotalElements());
        assertEquals(new BigDecimal("1000.00"), loans.findBySaleId(Long.valueOf(first.id())).orElseThrow().getTotalAmount());
    }

    @Test void changedRetryCannotDeductADifferentProduct() {
        Product first = product(94);
        Product second = product(94);
        UUID id = UUID.randomUUID();
        sales.recordSale(request(first, 1, "Pick up", "Cash", id));
        assertThrows(IllegalStateException.class, () -> sales.recordSale(request(second, 1, "Pick up", "Cash", id)));
        assertEquals(93, stock(first));
        assertEquals(94, stock(second));
    }

    @Test void simultaneousRetryCreatesOneSaleAndOneDeduction() throws Exception {
        Product p = product(94);
        var request = request(p, 1, "Deliver", "Utang", UUID.randomUUID());
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<SaleRecordDto> task = () -> { start.await(); return sales.recordSale(request); };
        try {
            var a = pool.submit(task); var b = pool.submit(task); start.countDown();
            assertEquals(a.get(15, TimeUnit.SECONDS).id(), b.get(15, TimeUnit.SECONDS).id());
            assertEquals(93, stock(p));
            assertEquals(1, movements.getMovements(p.getId(), 0, 10).getTotalElements());
        } finally { pool.shutdownNow(); }
    }

    @Test void concurrentSalesCannotOversellLastTank() throws Exception {
        Product p = product(1);
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<Boolean> task = () -> {
            start.await();
            try { sales.recordSale(request(p, 1, "Pick up", "Cash", UUID.randomUUID())); return true; }
            catch (IllegalArgumentException expected) { return false; }
        };
        try {
            var a = pool.submit(task); var b = pool.submit(task); start.countDown();
            assertNotEquals(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS));
            assertEquals(0, stock(p));
            assertEquals(1, movements.getMovements(p.getId(), 0, 10).getTotalElements());
        } finally { pool.shutdownNow(); }
    }

    @Test void concurrentDeletionRestoresStockOnceAndDelayedRetryCannotRecreateSale() throws Exception {
        Product p = product(94);
        var request = request(p, 1, "Pick up", "Cash", UUID.randomUUID());
        var sale = sales.recordSale(request);
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<Boolean> task = () -> {
            start.await();
            try { sales.deleteSale(Long.valueOf(sale.id()), "admin123"); return true; }
            catch (IllegalArgumentException expected) { return false; }
        };
        try {
            var a = pool.submit(task); var b = pool.submit(task); start.countDown();
            assertNotEquals(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS));
            assertEquals(94, stock(p));
            assertEquals(1, movements.getMovements(p.getId(), 0, 10).stream()
                    .filter(row -> row.movementType().equals("SALE_REVERSAL")).count());
            assertThrows(IllegalStateException.class, () -> sales.recordSale(request));
            assertEquals(94, stock(p));
        } finally { pool.shutdownNow(); }
    }

    @Test void stalePriceEditCannotRestoreSoldStock() {
        Product p = product(94);
        sales.recordSale(request(p, 1, "Pick up", "Cash", UUID.randomUUID()));
        assertThrows(IllegalStateException.class, () -> inventory.updateProduct(p.getId(),
                new UpdateProductRequest(p.getSku(), p.getName(), new BigDecimal("1100"), new BigDecimal("800"), 94)));
        assertEquals(93, stock(p));
    }
}
