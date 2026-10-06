package com.jjlpg.trading.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record PageResponseDto<T>(
        List<T> content,
        int number,
        int totalPages,
        long totalElements
) {
    public static <T> PageResponseDto<T> from(Page<T> page) {
        return new PageResponseDto<>(page.getContent(), page.getNumber(),
                page.getTotalPages(), page.getTotalElements());
    }
}
