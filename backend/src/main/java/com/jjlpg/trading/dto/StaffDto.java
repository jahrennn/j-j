package com.jjlpg.trading.dto;
import com.jjlpg.trading.entity.StaffRole;
public record StaffDto(Long id, String username, StaffRole role, boolean enabled) {}
