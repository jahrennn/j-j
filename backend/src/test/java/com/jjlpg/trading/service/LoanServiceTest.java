package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoanServiceTest {
    LoanRepository loans = mock(LoanRepository.class);
    LoanPaymentRepository payments = mock(LoanPaymentRepository.class);
    LoanService service = new LoanService(loans, payments);
    final LocalDate date = LocalDate.of(2026, 10, 1);
    BigDecimal money(String value) { return new BigDecimal(value); }
    @BeforeEach void setup() {
        when(loans.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }
    Loan loan(String paid) {
        Loan loan = new Loan();
        loan.setId(1L); loan.setCategory(LoanCategory.OTHER);
        loan.setBorrowerName("Borrower"); loan.setLoanDate(date);
        loan.setTotalAmount(money("100.00")); loan.setAmountPaid(money(paid));
        loan.setRemainingBalance(money("100.00").subtract(money(paid)));
        loan.setStatus(money(paid).signum() == 0 ? LoanStatus.UNPAID : LoanStatus.PARTIALLY_PAID);
        when(loans.findByIdForUpdate(1L)).thenReturn(Optional.of(loan));
        return loan;
    }
    @Test void initialPaymentIsLoggedAndBalanceIsExact() {
        var result = service.createOtherLoan(new CreateLoanRequest(" Borrower ", date, " Cash ", money("100.00"), money("0.10"), null));
        assertEquals("Borrower", result.borrowerName());
        assertEquals(money("99.90"), result.remainingBalance());
        assertEquals("PARTIALLY_PAID", result.status());
        assertEquals(1, result.payments().size());
        verify(payments).save(any());
    }
    @Test void absentDownpaymentCreatesUnpaidLoan() {
        var result = service.createOtherLoan(new CreateLoanRequest("Borrower", date, "Cash", money("100.00"), null, null));
        assertEquals("UNPAID", result.status());
        assertEquals(money("100.00"), result.remainingBalance());
        verifyNoInteractions(payments);
    }
    @Test void fullPaymentRetainsLoanAndHistory() {
        Loan loan = loan("40.00");
        var result = service.recordPayment(1L, new RecordPaymentRequest(money("60.00"), date, "Final payment", null));
        assertEquals("PAID", result.status());
        assertEquals(money("0.00"), result.remainingBalance());
        assertEquals(money("100.00"), loan.getAmountPaid());
        assertEquals(1, result.payments().size());
        assertThrows(IllegalStateException.class, () -> service.recordPayment(1L, new RecordPaymentRequest(money("1.00"), date, null, null)));
        verify(loans, never()).delete(any());
    }
    @Test void invalidPaymentsDoNotChangeBalancesOrHistory() {
        Loan loan = loan("40.00");
        for (String amount : new String[]{"-1.00", "0.00", "60.01"}) {
            assertThrows(IllegalArgumentException.class, () -> service.recordPayment(1L, new RecordPaymentRequest(money(amount), date, null, null)));
        }
        assertEquals(money("60.00"), loan.getRemainingBalance());
        verifyNoInteractions(payments);
    }
    @Test void excessInitialPaymentCreatesNothing() {
        assertThrows(IllegalArgumentException.class, () -> service.createOtherLoan(new CreateLoanRequest("Borrower", date, "Cash", money("100.00"), money("100.01"), null)));
        verify(loans, never()).save(any());
        verifyNoInteractions(payments);
    }
    @Test void lpgLoanLinksSaleAndLogsDownpayment() {
        Sale sale = new Sale(); sale.setTransactionId("TXN-TEST");
        Loan loan = service.createLpgLoan(sale, "Customer", date, "Tank (2x)", money("200.00"), money("50.00"));
        assertSame(sale, loan.getSale());
        assertEquals(LoanCategory.LPG, loan.getCategory());
        assertEquals(money("150.00"), loan.getRemainingBalance());
        assertEquals(1, loan.getPayments().size());
    }
}
