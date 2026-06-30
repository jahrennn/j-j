package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.Sale;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.entity.User;
import com.jjlpg.trading.repository.ProductRepository;
import com.jjlpg.trading.repository.SaleRepository;
import com.jjlpg.trading.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SalesService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SalesService(SaleRepository saleRepository, ProductRepository productRepository,
                        UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public SaleRecordDto recordSale(CreateSaleRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        if (product.getStock() < request.quantity()) {
            throw new IllegalArgumentException("Insufficient stock");
        }

        product.setStock(product.getStock() - request.quantity());
        productRepository.save(product);

        Sale sale = new Sale();
        sale.setSaleDate(LocalDate.now());
        sale.setTransactionId("TXN-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        sale.setItemType(product.getType());
        sale.setItemName(product.getName());
        sale.setProductId(product.getId());
        sale.setQuantity(request.quantity());
        sale.setTotalAmount(product.getUnitPrice().multiply(BigDecimal.valueOf(request.quantity())));
        sale.setCapital(product.getCapital().multiply(BigDecimal.valueOf(request.quantity())));
        sale.setBuyerName(request.buyerName());
        
        if ("Pick up".equalsIgnoreCase(request.deliveryMethod())) {
            sale.setAddress("Pick up");
        } else {
            sale.setAddress(request.address() != null && !request.address().isBlank() ? request.address() : "Unknown");
        }

        Sale savedSale = saleRepository.save(sale);
        // Return with dynamic profit using current product capital
        return toDto(savedSale, product);
    }

    @Transactional(readOnly = true)
    public SalesResponseDto getSales(LocalDate startDate, LocalDate endDate) {
        List<Sale> sales = saleRepository.findByDateRange(startDate, endDate);

        // Fetch current capitals for all linked products in one query
        Set<Long> productIds = sales.stream()
                .filter(s -> s.getProductId() != null)
                .map(Sale::getProductId)
                .collect(Collectors.toSet());
        Map<Long, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        List<SaleRecordDto> records = sales.stream()
                .map(s -> toDto(s, productMap.get(s.getProductId())))
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
        if (!saleRepository.existsById(saleId)) {
            throw new IllegalArgumentException("Sale record not found");
        }
        saleRepository.deleteById(saleId);
    }

    /**
     * Builds a SaleRecordDto. If a current product is provided, profit is recalculated
     * dynamically using the product's current capital (reflects inventory capital updates).
     * Falls back to the snapshotted capital stored on the sale for old records.
     */
    private SaleRecordDto toDto(Sale sale, Product currentProduct) {
        BigDecimal capital;
        if (currentProduct != null) {
            capital = currentProduct.getCapital().multiply(BigDecimal.valueOf(sale.getQuantity()));
        } else {
            capital = sale.getCapital(); // fallback for old records with no product_id
        }
        String displayName = (sale.getItemName() != null && !sale.getItemName().equals("Unknown Product"))
                ? sale.getItemName()
                : sale.getItemType().getLabel();
        return new SaleRecordDto(
                String.valueOf(sale.getId()),
                sale.getSaleDate().toString(),
                sale.getTransactionId(),
                sale.getItemType().getLabel(),
                displayName,
                sale.getQuantity(),
                sale.getTotalAmount(),
                capital,
                sale.getTotalAmount().subtract(capital),
                sale.getBuyerName(),
                sale.getAddress());
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
