package com.jjlpg.trading.controller;

import com.jjlpg.trading.dto.CreateProductRequest;
import com.jjlpg.trading.dto.InventoryResponseDto;
import com.jjlpg.trading.dto.ProductDto;
import com.jjlpg.trading.dto.UpdateStockRequest;
import com.jjlpg.trading.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public InventoryResponseDto getInventory() {
        return inventoryService.getInventory();
    }

    @PostMapping("/products")
    public ProductDto addProduct(@Valid @RequestBody CreateProductRequest request) {
        return inventoryService.addProduct(request);
    }

    @PutMapping("/products/{id}/stock")
    public ProductDto updateStock(@PathVariable Long id, @Valid @RequestBody UpdateStockRequest request) {
        return inventoryService.updateStock(id, request);
    }

    @PutMapping("/products/{id}")
    public ProductDto updateProduct(@PathVariable Long id, @Valid @RequestBody com.jjlpg.trading.dto.UpdateProductRequest request) {
        return inventoryService.updateProduct(id, request);
    }

    @DeleteMapping("/products/{id}")
    public org.springframework.http.ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        inventoryService.deleteProduct(id);
        return org.springframework.http.ResponseEntity.noContent().build();
    }
}
