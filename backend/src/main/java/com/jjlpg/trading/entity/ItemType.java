package com.jjlpg.trading.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ItemType {
    LPG_REFILL("LPG Refill"),
    LPG_TANK("LPG Tank");

    private final String label;

    ItemType(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static ItemType fromLabel(String label) {
        for (ItemType type : values()) {
            if (type.label.equalsIgnoreCase(label)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown ItemType label: " + label);
    }
}
