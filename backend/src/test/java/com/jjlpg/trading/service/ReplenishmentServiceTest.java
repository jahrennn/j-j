package com.jjlpg.trading.service;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.repository.SaleRepository;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;

class ReplenishmentServiceTest {
    ReplenishmentService service = new ReplenishmentService(mock(SaleRepository.class));
    Product product(int stock, int min, int lead, int coverage) {
        Product p = new Product(); p.setStock(stock); p.setMinimumStock(min); p.setLeadTimeDays(lead); p.setCoverageDays(coverage); return p;
    }
    @Test void alertsAtLeadTimeThresholdAndSuggestsCoveragePlusReserve() {
        var plan = service.calculate(product(16, 10, 3, 14), 60);
        assertEquals(16, plan.reorderPoint()); assertEquals(44, plan.targetStock());
        assertEquals(28, plan.suggestedQuantity()); assertTrue(plan.needsReorder());
        assertEquals(new BigDecimal("8.0"), plan.daysRemaining());
    }
    @Test void healthyStockDoesNotSuggestUnnecessaryPurchases() {
        var plan = service.calculate(product(17, 10, 3, 14), 60);
        assertFalse(plan.needsReorder()); assertEquals(0, plan.suggestedQuantity());
    }
    @Test void noRecentSalesUsesMinimumWithoutInventingRunOutDate() {
        var plan = service.calculate(product(4, 10, 3, 14), 0);
        assertNull(plan.daysRemaining()); assertEquals(6, plan.suggestedQuantity()); assertEquals(10, plan.reorderPoint());
    }
    @Test void roundingDisplayAverageDoesNotUnderestimateThreshold() {
        var plan = service.calculate(product(1, 0, 30, 1), 1);
        assertEquals(1, plan.reorderPoint()); assertEquals(2, plan.targetStock()); assertEquals(1, plan.suggestedQuantity());
    }
    @Test void eachProductCanHaveDifferentPolicyAndOutOfStockIsZeroDays() {
        var p = service.calculate(product(0, 5, 0, 7), 30);
        assertEquals(new BigDecimal("0.0"), p.daysRemaining()); assertEquals(5, p.reorderPoint()); assertEquals(12, p.suggestedQuantity());
        assertEquals(36, service.calculate(product(0, 8, 7, 7), 60).suggestedQuantity());
    }
}
