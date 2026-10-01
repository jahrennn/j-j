package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.Loan;
import com.jjlpg.trading.entity.LoanCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT e FROM Loan e WHERE e.id = :id")
    java.util.Optional<Loan> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    @Query("SELECT l FROM Loan l LEFT JOIN FETCH l.payments WHERE l.category = :category ORDER BY l.loanDate DESC, l.id DESC")
    List<Loan> findByCategory(@Param("category") LoanCategory category);

    @Query("SELECT l FROM Loan l LEFT JOIN FETCH l.payments ORDER BY l.loanDate DESC, l.id DESC")
    List<Loan> findAllWithPayments();

    Optional<Loan> findBySaleId(Long saleId);

    void deleteBySaleId(Long saleId);
}
