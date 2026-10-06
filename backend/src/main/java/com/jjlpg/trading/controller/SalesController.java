package com.jjlpg.trading.controller;

import com.jjlpg.trading.dto.CreateSaleRequest;
import com.jjlpg.trading.dto.DeleteSaleRequest;
import com.jjlpg.trading.dto.SaleRecordDto;
import com.jjlpg.trading.dto.SalesResponseDto;
import com.jjlpg.trading.dto.PageResponseDto;
import com.jjlpg.trading.dto.TankExchangeDto;
import com.jjlpg.trading.service.SalesService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/sales")
public class SalesController {

    private final SalesService salesService;

    public SalesController(SalesService salesService) {
        this.salesService = salesService;
    }

    @GetMapping
    public SalesResponseDto getSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return salesService.getSales(startDate, endDate);
    }

    @GetMapping("/tank-exchanges")
    public PageResponseDto<TankExchangeDto> getTankExchanges(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return PageResponseDto.from(salesService.getTankExchanges(page, size));
    }

    @PostMapping
    public SaleRecordDto recordSale(@Valid @RequestBody CreateSaleRequest request) {
        return salesService.recordSale(request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSale(@PathVariable Long id,
                                           @Valid @RequestBody DeleteSaleRequest request) {
        salesService.deleteSale(id, request.password());
        return ResponseEntity.noContent().build();
    }
}
