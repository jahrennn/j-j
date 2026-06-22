package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.CreateProductRequest;
import com.jjlpg.trading.dto.InventoryResponseDto;
import com.jjlpg.trading.dto.ProductDto;
import com.jjlpg.trading.dto.UpdateStockRequest;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class InventoryService {

    private final ProductRepository productRepository;

    public InventoryService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public InventoryResponseDto getInventory() {
        List<ProductDto> products = productRepository.findAll().stream()
                .sorted(Comparator.comparing(Product::getSku))
                .map(this::toDto)
                .toList();
        return new InventoryResponseDto(products);
    }

    @Transactional
    public ProductDto addProduct(CreateProductRequest request) {
        Product product = new Product();
        product.setSku(request.sku());
        product.setName(request.name());
        product.setType(request.type());
        product.setStock(request.stock());
        product.setUnitPrice(request.unitPrice());
        return toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateStock(Long productId, UpdateStockRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        product.setStock(request.stock());
        return toDto(productRepository.save(product));
    }

    private ProductDto toDto(Product product) {
        return new ProductDto(
                String.valueOf(product.getId()),
                product.getName(),
                product.getSku(),
                product.getType().getLabel(),
                product.getStock(),
                product.getUnitPrice());
    }
}
