package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;

public interface SaleRepository extends JpaRepository<Sale, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Sale s WHERE s.id = :id")
    java.util.Optional<Sale> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT coalesce(sum(s.totalAmount - s.capital), 0) FROM Sale s WHERE s.saleDate BETWEEN :startDate AND :endDate")
    BigDecimal sumProfit(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("""
            SELECT s FROM Sale s
            WHERE (cast(:startDate as date) IS NULL OR s.saleDate >= :startDate)
              AND (cast(:endDate as date) IS NULL OR s.saleDate <= :endDate)
            ORDER BY s.saleDate DESC, s.id DESC
            """)
    List<Sale> findByDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
