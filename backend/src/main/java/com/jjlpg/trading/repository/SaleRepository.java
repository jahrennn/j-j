package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

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
