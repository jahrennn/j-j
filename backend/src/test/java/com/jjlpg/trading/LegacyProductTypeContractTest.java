package com.jjlpg.trading;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjlpg.trading.entity.ItemType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LegacyProductTypeContractTest {
    @Test void deployedBackendReadsDisplayLabelForProductType() throws Exception {
        assertEquals(ItemType.LPG_TANK,
                new ObjectMapper().readValue("\"LPG Tank\"", ItemType.class));
    }
}
