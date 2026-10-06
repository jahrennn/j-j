package com.jjlpg.trading.service;

import com.jjlpg.trading.dto.StockMovementDto;
import com.jjlpg.trading.entity.Product;
import com.jjlpg.trading.entity.StockMovement;
import com.jjlpg.trading.entity.StockMovementType;
import com.jjlpg.trading.repository.StockMovementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockMovementService {
    private final StockMovementRepository repository;

    public StockMovementService(StockMovementRepository repository) {
        this.repository = repository;
    }

    public void record(Product product, StockMovementType type, int before, int after,
                       String reason, String transactionId) {
        StockMovement movement = new StockMovement();
        movement.setProductId(product.getId());
        movement.setProductSku(product.getSku());
        movement.setProductName(product.getName());
        movement.setMovementType(type);
        movement.setQuantityChange(Math.subtractExact(after, before));
        movement.setStockBefore(before);
        movement.setStockAfter(after);
        movement.setReason(reason);
        movement.setTransactionId(transactionId);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        movement.setActor(authentication != null && authentication.isAuthenticated()
                ? authentication.getName() : "system");
        repository.save(movement);
    }

    @Transactional(readOnly = true)
    public Page<StockMovementDto> getMovements(Long productId, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Page must be non-negative and size must be 1 to 100");
        }
        PageRequest pageable = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<StockMovement> movements = productId == null
                ? repository.findAll(pageable)
                : repository.findByProductId(productId, pageable);
        return movements.map(m -> new StockMovementDto(
                m.getId(), m.getProductId(), m.getProductSku(), m.getProductName(),
                m.getMovementType().name(), m.getQuantityChange(), m.getStockBefore(),
                m.getStockAfter(), m.getReason(), m.getActor(), m.getTransactionId(),
                m.getCreatedAt()));
    }
}
