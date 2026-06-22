package com.jjlpg.trading.dto;

import java.util.List;

public record SalesResponseDto(SalesSummaryDto summary, List<SaleRecordDto> records) {
}
