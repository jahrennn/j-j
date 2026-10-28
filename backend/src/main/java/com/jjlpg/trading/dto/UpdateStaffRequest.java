package com.jjlpg.trading.dto;
import com.jjlpg.trading.entity.StaffRole;
import jakarta.validation.constraints.*;
public record UpdateStaffRequest(@NotNull StaffRole role, @NotNull Boolean enabled,
        @Size(min = 8, max = 72) String password) {}
