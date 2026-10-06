package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class StockHistoryTest {
    private BigDecimal money(String value) { return new BigDecimal(value); }

    private Product product() {
        Product product = new Product();
        product.setId(1L);
        product.setSku("RF-11");
        product.setName("11kg Refill");
        product.setType(ItemType.LPG_REFILL);
        product.setStock(10);
        product.setCapital(money("700.00"));
        product.setUnitPrice(money("900.00"));
        return product;
    }

    @Test
    void completedSalesKeepTheirOriginalCapitalAndPrice() {
        Product product = product();
        ProductRepository products = mock(ProductRepository.class);
        SaleRepository sales = mock(SaleRepository.class);
        StockMovementService movements = mock(StockMovementService.class);
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));
        when(products.save(any())).thenAnswer(call -> call.getArgument(0));
        List<Sale> saved = new ArrayList<>();
        when(sales.save(any())).thenAnswer(call -> {
            Sale sale = call.getArgument(0);
            sale.setId((long) saved.size() + 1);
            saved.add(sale);
            return sale;
        });
        when(sales.findByDateRange(nullable(LocalDate.class), nullable(LocalDate.class)))
                .thenAnswer(call -> saved);
        SalesService service = new SalesService(sales, products, mock(UserRepository.class),
                mock(PasswordEncoder.class), mock(LoanService.class), mock(LoanRepository.class), movements,
                mock(TankExchangeRepository.class));

        SaleRecordDto first = service.recordSale(new CreateSaleRequest(1L, 2, "Buyer", "", "Pick up", "Cash", null));
        assertEquals(money("1800.00"), first.totalAmount());
        assertEquals(money("1400.00"), first.capital());
        assertEquals(money("400.00"), first.profit());

        product.setCapital(money("800.00"));
        product.setUnitPrice(money("1000.00"));
        SaleRecordDto second = service.recordSale(new CreateSaleRequest(1L, 1, "Buyer", "", "Pick up", "Cash", null));
        List<SaleRecordDto> reported = service.getSales(LocalDate.now(), LocalDate.now()).records();
        assertEquals(money("400.00"), reported.get(0).profit());
        assertEquals(money("1400.00"), reported.get(0).capital());
        assertEquals(money("1800.00"), reported.get(0).totalAmount());
        assertEquals(money("1000.00"), second.totalAmount());
        assertEquals(money("800.00"), reported.get(1).capital());
        assertEquals(money("600.00"), service.getSales(null, null).summary().totalProfit());
        verify(movements, times(2)).record(eq(product), eq(StockMovementType.SALE), anyInt(), anyInt(), anyString(), anyString());
    }

    @Test
    void adjustmentRequiresReasonAndRecordsActorAndQuantity() {
        StockMovementRepository repository = mock(StockMovementRepository.class);
        StockMovementService movementService = new StockMovementService(repository);
        Product product = product();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of()));
        try {
            movementService.record(product, StockMovementType.DAMAGE, 10, 8, "Broken valve", null);
            ArgumentCaptor<StockMovement> saved = ArgumentCaptor.forClass(StockMovement.class);
            verify(repository).save(saved.capture());
            assertEquals(-2, saved.getValue().getQuantityChange());
            assertEquals("admin", saved.getValue().getActor());
            assertEquals("Broken valve", saved.getValue().getReason());
            assertEquals(8, saved.getValue().getStockAfter());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void priceEditCannotChangeStockAndDamageMustReduceIt() {
        Product product = product();
        ProductRepository products = mock(ProductRepository.class);
        StockMovementService movements = mock(StockMovementService.class);
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));
        when(products.save(any())).thenAnswer(call -> call.getArgument(0));
        InventoryService service = new InventoryService(products, mock(UserRepository.class),
                mock(PasswordEncoder.class), movements);

        service.updateProduct(1L, new UpdateProductRequest("RF-11", "11kg Refill",
                money("1050.00"), money("800.00")));
        assertEquals(10, product.getStock());
        assertEquals(money("1050.00"), product.getUnitPrice());
        verifyNoInteractions(movements);

        assertThrows(IllegalStateException.class, () -> service.updateProduct(1L,
                new UpdateProductRequest("RF-11", "11kg Refill", money("1200.00"),
                        money("900.00"), 11)));
        assertEquals(10, product.getStock());
        assertEquals(money("1050.00"), product.getUnitPrice());

        assertThrows(IllegalArgumentException.class, () -> service.updateStock(1L,
                new UpdateStockRequest(11, StockMovementType.DAMAGE, "Broken")));
        assertEquals(10, product.getStock());
        service.updateStock(1L, new UpdateStockRequest(8, StockMovementType.DAMAGE, "Broken"));
        assertEquals(8, product.getStock());
        verify(movements).record(product, StockMovementType.DAMAGE, 10, 8, "Broken", null);
    }

    @Test
    void deletingCashSaleRestoresStockAndRecordsReversal() {
        Product product = product();
        product.setStock(8);
        Sale sale = new Sale();
        sale.setId(7L);
        sale.setProductId(1L);
        sale.setQuantity(2);
        sale.setTransactionId("TXN-OLD");
        ProductRepository products = mock(ProductRepository.class);
        SaleRepository sales = mock(SaleRepository.class);
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder passwords = mock(PasswordEncoder.class);
        LoanRepository loans = mock(LoanRepository.class);
        StockMovementService movements = mock(StockMovementService.class);
        User admin = new User();
        admin.setPasswordHash("hash");
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(passwords.matches("secret", "hash")).thenReturn(true);
        when(sales.findById(7L)).thenReturn(Optional.of(sale));
        when(loans.findBySaleId(7L)).thenReturn(Optional.empty());
        when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));

        SalesService service = new SalesService(sales, products, users, passwords,
                mock(LoanService.class), loans, movements, mock(TankExchangeRepository.class));
        service.deleteSale(7L, "secret");

        assertEquals(10, product.getStock());
        verify(products).save(product);
        verify(movements).record(product, StockMovementType.SALE_REVERSAL, 8, 10,
                "Deleted sale TXN-OLD", "TXN-OLD");
        verify(sales).delete(sale);
    }

    @Test
    void oldFrontendResponseFieldsRemainAvailableDuringDeployment() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        SaleRecordDto sale = new SaleRecordDto("1", "2026-10-07", "TXN-1", "Brand Tank",
                1, money("100.00"), money("80.00"), money("20.00"), "Buyer", "Pick up",
                "Pick up", "CASH", BigDecimal.ZERO);
        var saleJson = mapper.valueToTree(sale);
        assertEquals("Brand Tank", saleJson.get("productName").asText());
        assertEquals("Brand Tank", saleJson.get("itemName").asText());
        assertEquals("LPG Tank", saleJson.get("item").asText());

        var productJson = mapper.valueToTree(new ProductDto("1", "Brand Tank", "TK-1",
                5, money("100.00"), money("80.00")));
        assertEquals("LPG Tank", productJson.get("type").asText());
        var loanJson = mapper.valueToTree(new LoanResponseDto(1L, "LPG", "Buyer", "2026-10-07",
                "Sale", "Brand Tank (1x)", money("100.00"), BigDecimal.ZERO,
                money("100.00"), "UNPAID", null, 1L, List.of()));
        assertEquals("Brand Tank (1x)", loanJson.get("itemsPurchased").asText());
    }
}
