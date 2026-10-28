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
    private final ReplenishmentService replenishment;
    private final AuditService audit;

    public InventoryService(ProductRepository productRepository,
                            UserRepository userRepository,
                            PasswordEncoder passwordEncoder, StockMovementService movements, ReplenishmentService replenishment, AuditService audit) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.movements = movements;
        this.replenishment = replenishment;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public InventoryResponseDto getInventory() {
        var units = replenishment.recentUnits();
        List<ProductDto> products = productRepository.findAll().stream()
                .sorted(Comparator.comparing(Product::getSku))
                .map(p -> toDto(p, units))
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
        if (product.getCapital().compareTo(request.capital()) != 0)
            audit.record("COST_CHANGED", "PRODUCT", productId, product.getName() + " · capital PHP " + product.getCapital() + " → " + request.capital());
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
        if (product.getUnitPrice().compareTo(request.unitPrice()) != 0 || product.getCapital().compareTo(request.capital()) != 0)
            audit.record("PRICE_CHANGED", "PRODUCT", productId, product.getName() + " · SRP PHP " + product.getUnitPrice() + " → " + request.unitPrice()
                    + "; capital PHP " + product.getCapital() + " → " + request.capital());
        product.setSku(request.sku());
        product.setName(request.name());
        product.setUnitPrice(request.unitPrice());
        product.setCapital(request.capital());
        return toDto(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long productId, String password) {
        User admin = userRepository.findByUsername("system".equals(com.jjlpg.trading.security.Actor.username()) ? "admin" : com.jjlpg.trading.security.Actor.username())
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

    @Transactional
    public ProductDto updateReplenishment(Long productId, com.jjlpg.trading.dto.RestockSettingsRequest request) {
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        String before = "minimum " + product.getMinimumStock() + ", lead " + product.getLeadTimeDays() + ", coverage " + product.getCoverageDays();
        product.setMinimumStock(request.minimumStock()); product.setLeadTimeDays(request.leadTimeDays()); product.setCoverageDays(request.coverageDays());
        audit.record("RESTOCK_SETTINGS_CHANGED", "PRODUCT", productId, product.getName() + " · " + before + " → minimum " + request.minimumStock() + ", lead " + request.leadTimeDays() + ", coverage " + request.coverageDays());
        return toDto(productRepository.save(product));
    }

    private ProductDto toDto(Product product) { return toDto(product, replenishment.recentUnits()); }
    private ProductDto toDto(Product product, java.util.Map<Long, Long> units) {
        return new ProductDto(
                String.valueOf(product.getId()),
                product.getName(),
                product.getSku(),
                product.getStock(),
                product.getUnitPrice(),
                com.jjlpg.trading.security.Actor.isOwner() ? product.getCapital() : null,
                replenishment.calculate(product, units.getOrDefault(product.getId(), 0L)));
    }
}
