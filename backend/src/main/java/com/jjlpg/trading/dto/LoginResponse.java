package com.jjlpg.trading.dto;

public record LoginResponse(String token, String username, com.jjlpg.trading.entity.StaffRole role) {
    public LoginResponse(String token, String username) { this(token, username, com.jjlpg.trading.entity.StaffRole.OWNER); }
}
