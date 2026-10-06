package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.CreateProductRequest;
import com.jjlpg.trading.dto.InventoryResponseDto;
import com.jjlpg.trading.dto.ProductDto;
import com.jjlpg.trading.dto.UpdateStockRequest;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.entity.ItemType;
import com.jjlpg.trading.entity.StockMovementType;
import com.jjlpg.trading.entity.User;
import com.jjlpg.trading.repository.ProductRepository;
import com.jjlpg.trading.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class InventoryService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StockMovementService movements;

    public InventoryService(ProductRepository productRepository,
                            UserRepository userRepository,
                            PasswordEncoder passwordEncoder, StockMovementService movements) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.movements = movements;
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
        product.setType(ItemType.LPG_TANK);
        product.setStock(request.stock());
        product.setUnitPrice(request.unitPrice());
        product.setCapital(request.capital());
        Product saved = productRepository.save(product);
        movements.record(saved, StockMovementType.OPENING, 0, saved.getStock(),
                "Initial stock when product was added", null);
        return toDto(saved);
    }

    @Transactional
    public ProductDto updateStock(Long productId, UpdateStockRequest request) {
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        if (request.movementType() != StockMovementType.CORRECTION
                && request.movementType() != StockMovementType.DAMAGE) {
            throw new IllegalArgumentException("Adjustment type must be CORRECTION or DAMAGE");
        }
        int before = product.getStock();
        if (before == request.stock()) {
            throw new IllegalArgumentException("New stock must differ from current stock");
        }
        if (request.movementType() == StockMovementType.DAMAGE && request.stock() >= before) {
            throw new IllegalArgumentException("Damaged stock must reduce the current quantity");
        }
        product.setStock(request.stock());
        movements.record(product, request.movementType(), before, product.getStock(),
                request.reason().trim(), null);
        return toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto restockProduct(Long productId, com.jjlpg.trading.dto.RestockRequest request) {
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        int before = product.getStock();
        product.setStock(Math.addExact(before, request.quantity()));
        product.setCapital(request.capital());
        String note = request.note() == null || request.note().isBlank()
                ? "Stock replenishment" : request.note().trim();
        movements.record(product, StockMovementType.RESTOCK, before, product.getStock(), note, null);
        return toDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long productId, com.jjlpg.trading.dto.UpdateProductRequest request) {
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        if (request.stock() != null && !request.stock().equals(product.getStock())) {
            throw new IllegalStateException("This app version cannot edit stock here. Refresh the app and use Adjust Stock with a reason.");
        }
        product.setSku(request.sku());
        product.setName(request.name());
        product.setUnitPrice(request.unitPrice());
        product.setCapital(request.capital());
        return toDto(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long productId, String password) {
        User admin = userRepository.findByUsername("admin")
                .orElseThrow(() -> new IllegalStateException("Admin user not found"));
        if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect password");
        }
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        movements.record(product, StockMovementType.PRODUCT_DELETED, product.getStock(), 0,
                "Product deleted after password confirmation", null);
        productRepository.deleteById(productId);
    }

    private ProductDto toDto(Product product) {
        return new ProductDto(
                String.valueOf(product.getId()),
                product.getName(),
                product.getSku(),
                product.getStock(),
                product.getUnitPrice(),
                product.getCapital());
    }
}
