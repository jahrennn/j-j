package com.jjlpg.trading.dto;
import com.jjlpg.trading.entity.StaffRole;
import jakarta.validation.constraints.*;
public record CreateStaffRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{3,100}") String username,
        @NotBlank @Size(min = 8, max = 72) String password, @NotNull StaffRole role) {}
