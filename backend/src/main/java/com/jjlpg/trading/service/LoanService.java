package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.LoanPaymentRepository;
import com.jjlpg.trading.repository.LoanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
public class LoanService {

    private final LoanRepository loanRepository;
    private final LoanPaymentRepository loanPaymentRepository;

    public LoanService(LoanRepository loanRepository, LoanPaymentRepository loanPaymentRepository) {
        this.loanRepository = loanRepository;
        this.loanPaymentRepository = loanPaymentRepository;
    }

    @Transactional(readOnly = true)
    public List<LoanResponseDto> getLoans(LoanCategory category) {
        List<Loan> loans = (category != null)
                ? loanRepository.findByCategory(category)
                : loanRepository.findAllWithPayments();

        return loans.stream().map(this::toDto).toList();
    }

    @Transactional
    public LoanResponseDto createOtherLoan(CreateLoanRequest request) {
        Loan loan = new Loan();
        loan.setCategory(LoanCategory.OTHER);
        loan.setBorrowerName(request.borrowerName().trim());
        loan.setLoanDate(request.loanDate() != null ? request.loanDate() : LocalDate.now(java.time.ZoneId.of("Asia/Manila")));
        loan.setDescription(request.description().trim());
        loan.setTotalAmount(request.totalAmount());
        loan.setNotes(request.notes());

        BigDecimal downpayment = request.downpayment() != null ? request.downpayment() : BigDecimal.ZERO;
        if (downpayment.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Downpayment cannot be negative");
        }
        if (downpayment.compareTo(request.totalAmount()) > 0) {
            throw new IllegalArgumentException("Downpayment cannot exceed total loan amount");
        }

        loan.setAmountPaid(downpayment);
        BigDecimal remaining = request.totalAmount().subtract(downpayment);
        loan.setRemainingBalance(remaining);

        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            loan.setStatus(LoanStatus.PAID);
        } else if (downpayment.compareTo(BigDecimal.ZERO) > 0) {
            loan.setStatus(LoanStatus.PARTIALLY_PAID);
        } else {
            loan.setStatus(LoanStatus.UNPAID);
        }

        Loan savedLoan = loanRepository.save(loan);

        if (downpayment.compareTo(BigDecimal.ZERO) > 0) {
            LoanPayment payment = new LoanPayment();
            payment.setLoan(savedLoan);
            payment.setAmount(downpayment);
            payment.setPaymentDate(loan.getLoanDate());
            payment.setNotes("Initial Downpayment");
            loanPaymentRepository.save(payment);
            savedLoan.getPayments().add(payment);
        }

        return toDto(savedLoan);
    }

    @Transactional
    public Loan createLpgLoan(Sale sale, String buyerName, LocalDate date, String productPurchased,
                              BigDecimal totalAmount, BigDecimal downpayment) {
        Loan loan = new Loan();
        loan.setCategory(LoanCategory.LPG);
        loan.setBorrowerName(buyerName != null ? buyerName.trim() : "Unknown");
        loan.setLoanDate(date != null ? date : LocalDate.now(java.time.ZoneId.of("Asia/Manila")));
        loan.setProductPurchased(productPurchased);
        loan.setDescription("LPG Sale - " + sale.getTransactionId());
        loan.setTotalAmount(totalAmount);
        loan.setSale(sale);

        BigDecimal dp = downpayment != null ? downpayment : BigDecimal.ZERO;
        if (dp.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Downpayment cannot be negative");
        }
        if (dp.compareTo(totalAmount) > 0) {
            throw new IllegalArgumentException("Downpayment cannot exceed total amount");
        }

        loan.setAmountPaid(dp);
        BigDecimal remaining = totalAmount.subtract(dp);
        loan.setRemainingBalance(remaining);

        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            loan.setStatus(LoanStatus.PAID);
        } else if (dp.compareTo(BigDecimal.ZERO) > 0) {
            loan.setStatus(LoanStatus.PARTIALLY_PAID);
        } else {
            loan.setStatus(LoanStatus.UNPAID);
        }

        Loan savedLoan = loanRepository.save(loan);

        if (dp.compareTo(BigDecimal.ZERO) > 0) {
            LoanPayment payment = new LoanPayment();
            payment.setLoan(savedLoan);
            payment.setAmount(dp);
            payment.setPaymentDate(date != null ? date : LocalDate.now(java.time.ZoneId.of("Asia/Manila")));
            payment.setNotes("Initial Downpayment");
            loanPaymentRepository.save(payment);
            savedLoan.getPayments().add(payment);
        }

        return savedLoan;
    }

    @Transactional
    public LoanResponseDto recordPayment(Long loanId, RecordPaymentRequest request) {
        Loan loan = loanRepository.findByIdForUpdate(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found with id: " + loanId));

        // Lock the loan first so concurrent retries cannot insert twice.
        if (request.requestId() != null) {
            var previous = loanPaymentRepository.findByLoanIdAndRequestId(loanId, request.requestId());
            if (previous.isPresent()) {
                LoanPayment payment = previous.get();
                if (payment.getAmount().compareTo(request.amount()) != 0
                        || (request.paymentDate() != null && !payment.getPaymentDate().equals(request.paymentDate()))
                        || !java.util.Objects.equals(payment.getNotes(), request.notes())) {
                    throw new IllegalStateException("This payment request was already used with different details");
                }
                return toDto(loan);
            }
        }

        if (loan.getStatus() == LoanStatus.PAID || loan.getRemainingBalance().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Loan is already fully paid");
        }

        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        if (request.amount().compareTo(loan.getRemainingBalance()) > 0) {
            throw new IllegalArgumentException("Payment amount (" + request.amount() + 
                    ") cannot exceed remaining balance (" + loan.getRemainingBalance() + ")");
        }

        LoanPayment payment = new LoanPayment();
        payment.setLoan(loan);
        payment.setRequestId(request.requestId());
        payment.setAmount(request.amount());
        payment.setPaymentDate(request.paymentDate() != null ? request.paymentDate() : LocalDate.now(java.time.ZoneId.of("Asia/Manila")));
        payment.setNotes(request.notes());
        loanPaymentRepository.save(payment);
        loan.getPayments().add(payment);

        BigDecimal newAmountPaid = loan.getAmountPaid().add(request.amount());
        BigDecimal newRemaining = loan.getTotalAmount().subtract(newAmountPaid);
        if (newRemaining.compareTo(BigDecimal.ZERO) < 0) {
            newRemaining = BigDecimal.ZERO;
        }

        loan.setAmountPaid(newAmountPaid);
        loan.setRemainingBalance(newRemaining);

        if (newRemaining.compareTo(BigDecimal.ZERO) == 0) {
            loan.setStatus(LoanStatus.PAID);
        } else {
            loan.setStatus(LoanStatus.PARTIALLY_PAID);
        }

        Loan updated = loanRepository.save(loan);
        return toDto(updated);
    }

    private LoanResponseDto toDto(Loan loan) {
        List<LoanPaymentDto> paymentDtos = loan.getPayments() != null
                ? loan.getPayments().stream()
                    .sorted(Comparator.comparing(LoanPayment::getPaymentDate).reversed()
                            .thenComparing(LoanPayment::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                    .map(p -> new LoanPaymentDto(
                            p.getId(),
                            p.getAmount(),
                            p.getPaymentDate().toString(),
                            p.getNotes(),
                            p.getCreatedAt() != null ? p.getCreatedAt().toString() : null
                    ))
                    .toList()
                : List.of();

        return new LoanResponseDto(
                loan.getId(),
                loan.getCategory().name(),
                loan.getBorrowerName(),
                loan.getLoanDate().toString(),
                loan.getDescription(),
                loan.getProductPurchased(),
                loan.getTotalAmount(),
                loan.getAmountPaid(),
                loan.getRemainingBalance(),
                loan.getStatus().name(),
                loan.getNotes(),
                loan.getSale() != null ? loan.getSale().getId() : null,
                paymentDtos
        );
    }
}
