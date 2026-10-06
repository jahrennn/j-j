package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.Sale;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.entity.User;
import com.jjlpg.trading.entity.StockMovementType;
import com.jjlpg.trading.repository.ProductRepository;
import com.jjlpg.trading.repository.SaleRepository;
import com.jjlpg.trading.repository.UserRepository;
import com.jjlpg.trading.repository.LoanRepository;
import com.jjlpg.trading.repository.TankExchangeRepository;
import com.jjlpg.trading.entity.TankExchange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class SalesService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoanService loanService;
    private final LoanRepository loanRepository;
    private final StockMovementService movements;
    private final TankExchangeRepository tankExchanges;

    public SalesService(SaleRepository saleRepository, ProductRepository productRepository,
                        UserRepository userRepository, PasswordEncoder passwordEncoder,
                        LoanService loanService, LoanRepository loanRepository,
                        StockMovementService movements, TankExchangeRepository tankExchanges) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loanService = loanService;
        this.loanRepository = loanRepository;
        this.movements = movements;
        this.tankExchanges = tankExchanges;
    }

    @Transactional
    public SaleRecordDto recordSale(CreateSaleRequest request) {
        Product product = productRepository.findByIdForUpdate(request.productId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        Product customerTank = null;
        if (request.tankExchange() != null) {
            if (!product.getId().equals(request.tankExchange().suppliedTankProductId())) {
                throw new IllegalArgumentException("For a tank exchange, the supplied tank must be the tank product sold");
            }
            customerTank = productRepository.findById(request.tankExchange().customerTankProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Customer tank product not found"));
        }

        if (product.getStock() < request.quantity()) {
            throw new IllegalArgumentException("Insufficient stock");
        }

        int stockBefore = product.getStock();
        product.setStock(stockBefore - request.quantity());
        productRepository.save(product);

        Sale sale = new Sale();
        sale.setSaleDate(LocalDate.now(java.time.ZoneId.of("Asia/Manila")));
        sale.setTransactionId("TXN-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        sale.setProductName(product.getName());
        sale.setProductId(product.getId());
        sale.setQuantity(request.quantity());
        sale.setTotalAmount(product.getUnitPrice().multiply(BigDecimal.valueOf(request.quantity())));
        sale.setCapital(product.getCapital().multiply(BigDecimal.valueOf(request.quantity())));
        sale.setBuyerName(request.buyerName());
        
        if ("Pick up".equalsIgnoreCase(request.deliveryMethod())) {
            sale.setDeliveryMethod("Pick up");
            sale.setAddress("Pick up");
        } else {
            sale.setDeliveryMethod("Deliver");
            sale.setAddress(request.address() != null && !request.address().isBlank() ? request.address() : "Unknown");
        }

        boolean isUtang = "Utang".equalsIgnoreCase(request.paymentMethod()) || "UTANG".equalsIgnoreCase(request.paymentMethod());
        sale.setPaymentMethod(isUtang ? "UTANG" : "CASH");
        BigDecimal downpayment = isUtang && request.downpayment() != null ? request.downpayment() : BigDecimal.ZERO;
        if (downpayment.signum() < 0 || downpayment.compareTo(sale.getTotalAmount()) > 0) {
            throw new IllegalArgumentException("Downpayment must be between zero and the total sale amount");
        }
        if (isUtang && sale.getTotalAmount().signum() <= 0) {
            throw new IllegalArgumentException("A credit sale must have a positive total amount");
        }
        sale.setDownpayment(downpayment);

        Sale savedSale = saleRepository.save(sale);
        movements.record(product, StockMovementType.SALE, stockBefore, product.getStock(),
                "Sale " + savedSale.getTransactionId(), savedSale.getTransactionId());

        if (customerTank != null) {
            TankExchange exchange = new TankExchange();
            exchange.setSale(savedSale);
            exchange.setCustomerTankProductId(customerTank.getId());
            exchange.setCustomerTankName(customerTank.getName());
            exchange.setCustomerTankSku(customerTank.getSku());
            exchange.setSuppliedTankProductId(product.getId());
            exchange.setSuppliedTankName(product.getName());
            exchange.setSuppliedTankSku(product.getSku());
            exchange.setQuantity(request.quantity());
            tankExchanges.save(exchange);
        }

        if (isUtang) {
            String productPurchased = sale.getProductName() + " (" + sale.getQuantity() + "x)";
            loanService.createLpgLoan(savedSale, sale.getBuyerName(), sale.getSaleDate(),
                    productPurchased, sale.getTotalAmount(), downpayment);
        }

        return toDto(savedSale);
    }

    @Transactional(readOnly = true)
    public SalesResponseDto getSales(LocalDate startDate, LocalDate endDate) {
        List<Sale> sales = saleRepository.findByDateRange(startDate, endDate);

        List<SaleRecordDto> records = sales.stream()
                .map(this::toDto)
                .toList();
        return new SalesResponseDto(summarize(records), records);
    }

    @Transactional
    public void deleteSale(Long saleId, String password) {
        // Verify admin password before deleting
        User admin = userRepository.findByUsername("admin")
                .orElseThrow(() -> new IllegalStateException("Admin user not found"));
        if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect password");
        }
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("Sale record not found"));
        if (loanRepository.findBySaleId(saleId).isPresent()) {
            throw new IllegalStateException("Sales linked to loans cannot be deleted; retain them for payment audit history");
        }
        if (tankExchanges.findBySaleId(saleId).isPresent()) {
            throw new IllegalStateException("Tank exchange sales cannot be deleted; retain them for exchange audit history");
        }
        if (sale.getProductId() != null) {
            productRepository.findByIdForUpdate(sale.getProductId()).ifPresent(product -> {
                int before = product.getStock();
                product.setStock(Math.addExact(before, sale.getQuantity()));
                productRepository.save(product);
                movements.record(product, StockMovementType.SALE_REVERSAL, before, product.getStock(),
                        "Deleted sale " + sale.getTransactionId(), sale.getTransactionId());
            });
        }
        saleRepository.delete(sale);
    }

    @Transactional(readOnly = true)
    public Page<TankExchangeDto> getTankExchanges(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Page must be non-negative and size must be 1 to 100");
        }
        return tankExchanges.findAll(PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))))
                .map(exchange -> new TankExchangeDto(exchange.getId(),
                        String.valueOf(exchange.getSale().getId()),
                        exchange.getSale().getTransactionId(),
                        exchange.getSale().getSaleDate().toString(),
                        exchange.getSale().getBuyerName(), exchange.getQuantity(),
                        exchange.getCustomerTankName(), exchange.getCustomerTankSku(),
                        exchange.getSuppliedTankName(), exchange.getSuppliedTankSku(),
                        exchange.getCreatedAt()));
    }

    /** Completed sales keep the capital and total recorded when they were created. */
    private SaleRecordDto toDto(Sale sale) {
        BigDecimal capital = sale.getCapital();
        String displayName = sale.getProductName();
        return new SaleRecordDto(
                String.valueOf(sale.getId()),
                sale.getSaleDate().toString(),
                sale.getTransactionId(),
                displayName,
                sale.getQuantity(),
                sale.getTotalAmount(),
                capital,
                sale.getTotalAmount().subtract(capital),
                sale.getBuyerName(),
                sale.getAddress(),
                sale.getDeliveryMethod(),
                sale.getPaymentMethod(),
                sale.getDownpayment());
    }

    private SalesSummaryDto summarize(List<SaleRecordDto> records) {
        BigDecimal totalRevenue = records.stream()
                .map(SaleRecordDto::totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalOrders = records.size();
        BigDecimal average = totalOrders == 0
                ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP);
        BigDecimal totalProfit = records.stream()
                .map(SaleRecordDto::profit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new SalesSummaryDto(totalRevenue, totalOrders, average, totalProfit);
    }
}
