package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.Expense;
import com.jjlpg.trading.entity.ExpenseCategory;
import com.jjlpg.trading.dto.ExpenseSummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    @Modifying
    @Query(value = """
            INSERT INTO public.expenses (request_id, expense_date, category, description, amount, paid_to, notes, created_by)
            VALUES (:requestId, :expenseDate, :category, :description, :amount, :paidTo, :notes, :actor)
            ON CONFLICT (request_id) DO NOTHING
            """, nativeQuery = true)
    int insertOnce(@Param("requestId") UUID requestId, @Param("expenseDate") LocalDate expenseDate,
                   @Param("category") String category, @Param("description") String description,
                   @Param("amount") BigDecimal amount, @Param("paidTo") String paidTo,
                   @Param("notes") String notes, @Param("actor") String actor);

    Optional<Expense> findByRequestId(UUID requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Expense e WHERE e.id = :id")
    Optional<Expense> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT e FROM Expense e
            WHERE (cast(:startDate as date) IS NULL OR e.expenseDate >= :startDate)
              AND (cast(:endDate as date) IS NULL OR e.expenseDate <= :endDate)
              AND e.category IN :categories
            """)
    Page<Expense> findByFilters(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate,
                               @Param("categories") List<ExpenseCategory> categories, Pageable pageable);

    @Query("""
            SELECT new com.jjlpg.trading.dto.ExpenseSummaryDto(
                coalesce(sum(e.amount), 0),
                coalesce(sum(case when e.category = com.jjlpg.trading.entity.ExpenseCategory.FUEL then e.amount else 0 end), 0),
                coalesce(sum(case when e.category = com.jjlpg.trading.entity.ExpenseCategory.SALARY then e.amount else 0 end), 0),
                coalesce(sum(case when e.category not in (com.jjlpg.trading.entity.ExpenseCategory.FUEL,
                    com.jjlpg.trading.entity.ExpenseCategory.SALARY) then e.amount else 0 end), 0), count(e))
            FROM Expense e
            WHERE e.status = 'RECORDED'
              AND (cast(:startDate as date) IS NULL OR e.expenseDate >= :startDate)
              AND (cast(:endDate as date) IS NULL OR e.expenseDate <= :endDate)
              AND e.category IN :categories
            """)
    ExpenseSummaryDto summarize(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate,
                                @Param("categories") List<ExpenseCategory> categories);
}
