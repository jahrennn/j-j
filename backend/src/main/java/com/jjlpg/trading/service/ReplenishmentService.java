package com.jjlpg.trading.service;
import com.jjlpg.trading.dto.ReplenishmentDto;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.repository.SaleRepository;
import org.springframework.stereotype.Service;
import java.math.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
@Service
public class ReplenishmentService {
    private final SaleRepository sales;
    public ReplenishmentService(SaleRepository sales) { this.sales = sales; }
    public Map<Long, Long> recentUnits() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Manila"));
        return sales.unitsByProduct(today.minusDays(29), today).stream()
                .collect(Collectors.toMap(SaleRepository.ProductUnits::getProductId, SaleRepository.ProductUnits::getUnits));
    }
    public ReplenishmentDto calculate(Product p, long units) {
        // Use the exact numerator for thresholds; display rounding must not alter reorder decisions.
        BigDecimal total = BigDecimal.valueOf(units);
        BigDecimal days = BigDecimal.valueOf(30);
        long demandDuringLead = total.multiply(BigDecimal.valueOf(p.getLeadTimeDays())).divide(days, 0, RoundingMode.CEILING).longValueExact();
        long point = p.getMinimumStock() + demandDuringLead;
        long target = p.getMinimumStock() + total.multiply(BigDecimal.valueOf(p.getLeadTimeDays() + p.getCoverageDays()))
                .divide(days, 0, RoundingMode.CEILING).longValueExact();
        boolean needs = p.getStock() <= point;
        return new ReplenishmentDto(p.getMinimumStock(), p.getLeadTimeDays(), p.getCoverageDays(), units, 30,
                total.divide(days, 2, RoundingMode.HALF_UP),
                units == 0 ? null : BigDecimal.valueOf(p.getStock()).multiply(days).divide(total, 1, RoundingMode.HALF_UP),
                point, target, needs ? Math.max(0, target - p.getStock()) : 0, needs);
    }
}
