package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.LoanPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanPaymentRepository extends JpaRepository<LoanPayment, Long> {
    java.util.Optional<LoanPayment> findByLoanIdAndRequestId(Long loanId, java.util.UUID requestId);

    List<LoanPayment> findByLoanIdOrderByPaymentDateDescCreatedAtDesc(Long loanId);
}
