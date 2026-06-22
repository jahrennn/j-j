package com.jjlpg.trading.entity;

public enum ItemType {
    LPG_REFILL("LPG Refill"),
    LPG_TANK("LPG Tank");

    private final String label;

    ItemType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
