package com.jjlpg.trading;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class ApiEndpointContractTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private String bearer;

    String auth() { return bearer; }

    JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    @Test void allApplicationEndpointsAcceptFrontendRequests() throws Exception {
        mvc.perform(get("/inventory")).andExpect(status().isUnauthorized());
        JsonNode login = json(mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk()).andReturn());
        bearer = "Bearer " + login.get("token").asText();
        mvc.perform(post("/auth/logout").header("Authorization", auth()))
                .andExpect(status().isOk());

        String skuA = "API-A-" + UUID.randomUUID().toString().substring(0, 8);
        String skuB = "API-B-" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode given = json(mvc.perform(post("/inventory/products").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"" + skuA + "\",\"name\":\"Brand A\",\"stock\":5,\"unitPrice\":100,\"capital\":70}"))
                .andExpect(status().isOk()).andReturn());
        JsonNode received = json(mvc.perform(post("/inventory/products").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"" + skuB + "\",\"name\":\"Brand B\",\"type\":\"LPG Tank\",\"stock\":0,\"unitPrice\":100,\"capital\":70}"))
                .andExpect(status().isOk()).andReturn());
        String givenId = given.get("id").asText();
        String receivedId = received.get("id").asText();
        assertEquals("Brand A", given.get("name").asText());

        mvc.perform(get("/inventory").header("Authorization", auth())).andExpect(status().isOk());
        mvc.perform(get("/inventory/movements").header("Authorization", auth())).andExpect(status().isOk());
        mvc.perform(put("/inventory/products/" + givenId).header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sku\":\"" + skuA + "\",\"name\":\"Brand A\",\"unitPrice\":110,\"capital\":75}"))
                .andExpect(status().isOk());
        mvc.perform(put("/inventory/products/" + givenId + "/stock").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"stock\":6,\"movementType\":\"CORRECTION\",\"reason\":\"Counted physical stock\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/inventory/products/" + givenId + "/restock").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\":2,\"capital\":80,\"note\":\"Supplier delivery\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/inventory/movements?productId=" + givenId).header("Authorization", auth()))
                .andExpect(status().isOk());

        mvc.perform(get("/settings").header("Authorization", auth())).andExpect(status().isOk());
        mvc.perform(put("/settings").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"businessName\":\"J&J\",\"contactNumber\":\"123\",\"address\":\"Manila\"}"))
                .andExpect(status().isOk());

        JsonNode exchangeSale = json(mvc.perform(post("/sales").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + givenId + ",\"quantity\":1,\"buyerName\":\"Exchange Buyer\",\"deliveryMethod\":\"Pick up\",\"paymentMethod\":\"Cash\",\"tankExchange\":{\"customerTankProductId\":" + receivedId + ",\"suppliedTankProductId\":" + givenId + "}}"))
                .andExpect(status().isOk()).andReturn());
        assertEquals("Brand A", exchangeSale.get("productName").asText());
        mvc.perform(get("/sales").header("Authorization", auth())).andExpect(status().isOk());
        JsonNode exchanges = json(mvc.perform(get("/sales/tank-exchanges").header("Authorization", auth()))
                .andExpect(status().isOk()).andReturn());
        assertTrue(exchanges.get("content").toString().contains(exchangeSale.get("transactionId").asText()));
        mvc.perform(delete("/sales/" + exchangeSale.get("id").asText()).header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"admin123\"}"))
                .andExpect(status().isConflict());

        JsonNode plainSale = json(mvc.perform(post("/sales").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + givenId + ",\"quantity\":1,\"buyerName\":\"Cash Buyer\",\"deliveryMethod\":\"Pick up\",\"paymentMethod\":\"Cash\"}"))
                .andExpect(status().isOk()).andReturn());
        mvc.perform(delete("/sales/" + plainSale.get("id").asText()).header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"admin123\"}"))
                .andExpect(status().isNoContent());

        JsonNode loan = json(mvc.perform(post("/loans").header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"borrowerName\":\"API Borrower\",\"description\":\"Cash loan\",\"totalAmount\":100,\"downpayment\":20}"))
                .andExpect(status().isOk()).andReturn());
        assertEquals(80, loan.get("remainingBalance").asInt());
        mvc.perform(get("/loans?category=OTHER").header("Authorization", auth())).andExpect(status().isOk());
        JsonNode paid = json(mvc.perform(post("/loans/" + loan.get("id").asText() + "/payments")
                .header("Authorization", auth()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"amount\":80,\"requestId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isOk()).andReturn());
        assertEquals("PAID", paid.get("status").asText());

        mvc.perform(delete("/inventory/products/" + receivedId).header("Authorization", auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"admin123\"}"))
                .andExpect(status().isNoContent());
    }
}
