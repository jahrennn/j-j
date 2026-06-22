package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.Sale;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.repository.ProductRepository;
import com.jjlpg.trading.repository.SaleRepository;
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

    public SalesService(SaleRepository saleRepository, ProductRepository productRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
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
        sale.setQuantity(request.quantity());
        sale.setTotalAmount(product.getUnitPrice().multiply(BigDecimal.valueOf(request.quantity())));

        Sale savedSale = saleRepository.save(sale);
        return toDto(savedSale);
    }

    @Transactional(readOnly = true)
    public SalesResponseDto getSales(LocalDate startDate, LocalDate endDate) {
        List<Sale> sales = saleRepository.findByDateRange(startDate, endDate);
        List<SaleRecordDto> records = sales.stream().map(this::toDto).toList();
        return new SalesResponseDto(summarize(records), records);
    }

    private SaleRecordDto toDto(Sale sale) {
        return new SaleRecordDto(
                String.valueOf(sale.getId()),
                sale.getSaleDate().toString(),
                sale.getTransactionId(),
                sale.getItemType().getLabel(),
                sale.getQuantity(),
                sale.getTotalAmount());
    }

    private SalesSummaryDto summarize(List<SaleRecordDto> records) {
        BigDecimal totalRevenue = records.stream()
                .map(SaleRecordDto::totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalOrders = records.size();
        BigDecimal average = totalOrders == 0
                ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP);
        return new SalesSummaryDto(totalRevenue, totalOrders, average);
    }
}
