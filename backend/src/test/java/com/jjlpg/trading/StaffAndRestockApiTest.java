package com.jjlpg.trading;

import com.fasterxml.jackson.databind.*;
import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.*;
import com.jjlpg.trading.security.JwtService;
import com.jjlpg.trading.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest @AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class StaffAndRestockApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired SaleRepository sales;
    @Autowired AuditEventRepository audit;
    @Autowired LoanRepository loans;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtService jwt;
    @Autowired LoanService loanService;
    String password = "staff-test-password";
    User staff(StaffRole role) {
        User u = new User(); u.setUsername("test-" + UUID.randomUUID().toString().substring(0, 12));
        u.setRole(role); u.setPasswordHash(passwords.encode(password)); return users.save(u);
    }
    String token(User u) { return "Bearer " + jwt.generateToken(u.getUsername(), u.getTokenVersion(), u.getId()); }
    JsonNode json(MvcResult response) throws Exception { return mapper.readTree(response.getResponse().getContentAsString()); }
    String body(Object value) throws Exception { return mapper.writeValueAsString(value); }
    Product product() {
        Product p = new Product(); p.setSku("ROLE-" + UUID.randomUUID().toString().substring(0, 10));
        p.setName("Role test LPG"); p.setType(ItemType.LPG_TANK); p.setStock(16);
        p.setUnitPrice(new BigDecimal("100.00")); p.setCapital(new BigDecimal("60.00")); return products.save(p);
    }
    @Test void cashierAndDriverCannotMutateStockPricesAccountsOrReadOwnerData() throws Exception {
        Product p = product();
        for (var role : List.of(StaffRole.CASHIER, StaffRole.DRIVER)) {
            User u = staff(role); String auth = token(u);
            mvc.perform(put("/inventory/products/"+p.getId()+"/stock").header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content("{\"stock\":20,\"movementType\":\"CORRECTION\",\"reason\":\"Forbidden\"}")).andExpect(status().isForbidden());
            mvc.perform(put("/inventory/products/"+p.getId()).header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content("{\"sku\":\"X\",\"name\":\"X\",\"unitPrice\":1,\"capital\":0}")).andExpect(status().isForbidden());
            mvc.perform(put("/inventory/products/"+p.getId()+"/replenishment").header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content("{\"minimumStock\":0,\"leadTimeDays\":0,\"coverageDays\":1}")).andExpect(status().isForbidden());
            mvc.perform(post("/inventory/products/"+p.getId()+"/restock").header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":2,\"capital\":10}")).andExpect(status().isForbidden());
            for (String path : List.of("/staff", "/audit", "/expenses", "/inventory/movements")) mvc.perform(get(path).header("Authorization",auth)).andExpect(status().isForbidden());
            mvc.perform(put("/settings").header("Authorization",auth).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
            JsonNode inventory = json(mvc.perform(get("/inventory").header("Authorization",auth)).andExpect(status().isOk()).andReturn());
            for (JsonNode row : inventory.get("products")) assertTrue(row.get("capital").isNull());
        }
        assertEquals(16,products.findById(p.getId()).orElseThrow().getStock());
    }
    @Test void cashierRecordsSaleAndDriverCollectsOnceWithServerAttribution() throws Exception {
        User cashier=staff(StaffRole.CASHIER), driver=staff(StaffRole.DRIVER); Product p=product();
        JsonNode sale=json(mvc.perform(post("/sales").header("Authorization",token(cashier)).contentType(MediaType.APPLICATION_JSON).content(body(Map.of("productId",p.getId(),"quantity",1,"buyerName","Role borrower","deliveryMethod","Pick up","paymentMethod","Utang","dueDate",LocalDate.now(ZoneId.of("Asia/Manila")).plusDays(7).toString())))).andExpect(status().isOk()).andReturn());
        assertTrue(sale.get("capital").isNull()); assertTrue(sale.get("profit").isNull());
        assertEquals(cashier.getUsername(),sale.get("recordedBy").asText());
        JsonNode report=json(mvc.perform(get("/sales").header("Authorization",token(cashier))).andExpect(status().isOk()).andReturn());
        assertTrue(report.get("summary").get("totalProfit").isNull());
        var loan=loans.findBySaleId(sale.get("id").asLong()).orElseThrow();
        String payment=body(Map.of("amount",40,"requestId",UUID.randomUUID().toString(),"collectedBy","forged-owner"));
        for(int i=0;i<2;i++) {
            JsonNode result=json(mvc.perform(post("/loans/"+loan.getId()+"/payments").header("Authorization",token(driver)).contentType(MediaType.APPLICATION_JSON).content(payment)).andExpect(status().isOk()).andReturn());
            assertEquals(driver.getUsername(),result.get("payments").get(0).get("collectedBy").asText());
            assertEquals(60,result.get("remainingBalance").asInt()); assertEquals(1,result.get("payments").size());
        }
        assertEquals(1,audit.findAll().stream().filter(e->e.getActor().equals(driver.getUsername()) && e.getAction().equals("PAYMENT_COLLECTED")).count());
        mvc.perform(get("/sales").header("Authorization",token(driver))).andExpect(status().isForbidden());
        mvc.perform(post("/sales").header("Authorization",token(driver)).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/loans").header("Authorization",token(driver)).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(put("/loans/"+loan.getId()+"/due-date").header("Authorization",token(driver)).contentType(MediaType.APPLICATION_JSON).content("{\"dueDate\":null}")).andExpect(status().isForbidden());
    }
    @Test void ownersManageAccountsAndChangesInvalidateOldTokens() throws Exception {
        User owner=staff(StaffRole.OWNER);
        String name="cash-"+UUID.randomUUID().toString().substring(0,10);
        JsonNode created=json(mvc.perform(post("/staff").header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content(body(Map.of("username",name,"password",password,"role","CASHIER")))).andExpect(status().isOk()).andReturn());
        assertFalse(created.has("passwordHash")); assertFalse(created.has("password"));
        User cashier=users.findByUsername(name).orElseThrow(); assertNotEquals(password,cashier.getPasswordHash());
        String stale=token(cashier);
        mvc.perform(get("/auth/me").header("Authorization",stale)).andExpect(status().isOk());
        mvc.perform(put("/staff/"+cashier.getId()).header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"DRIVER\",\"enabled\":false}")).andExpect(status().isOk());
        mvc.perform(get("/auth/me").header("Authorization",stale)).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body(Map.of("username",name,"password",password)))).andExpect(status().isUnauthorized());
        mvc.perform(put("/staff/"+cashier.getId()).header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"DRIVER\",\"enabled\":true,\"password\":\"replacement-password\"}")).andExpect(status().isOk());
        mvc.perform(get("/auth/me").header("Authorization",stale)).andExpect(status().isUnauthorized());
        JsonNode login=json(mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body(Map.of("username",name,"password","replacement-password")))).andExpect(status().isOk()).andReturn());
        assertEquals("DRIVER",login.get("role").asText());
        mvc.perform(get("/sales").header("Authorization","Bearer "+login.get("token").asText())).andExpect(status().isForbidden());
        mvc.perform(put("/staff/"+owner.getId()).header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"OWNER\",\"enabled\":false}")).andExpect(status().isConflict());
    }
    @Test void forecastsUseOnlyThirtyCalendarDaysAndPolicyChangesAreAudited() throws Exception {
        User owner=staff(StaffRole.OWNER); Product p=product(); LocalDate today=LocalDate.now(ZoneId.of("Asia/Manila"));
        for(var entry:List.of(Map.entry(today.minusDays(29),30),Map.entry(today,30),Map.entry(today.minusDays(30),100),Map.entry(today.plusDays(1),100))) {
            Sale s=new Sale();s.setProductId(p.getId());s.setSaleDate(entry.getKey());s.setTransactionId("TEST-"+UUID.randomUUID());s.setProductName(p.getName());s.setQuantity(entry.getValue());s.setTotalAmount(BigDecimal.ONE);s.setCapital(BigDecimal.ZERO);s.setBuyerName("Forecast");s.setAddress("Pick up");s.setDeliveryMethod("Pick up");s.setPaymentMethod("CASH");s.setDownpayment(BigDecimal.ZERO);sales.save(s);
        }
        JsonNode plan=json(mvc.perform(put("/inventory/products/"+p.getId()+"/replenishment").header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content("{\"minimumStock\":10,\"leadTimeDays\":3,\"coverageDays\":14}")).andExpect(status().isOk()).andReturn()).get("replenishment");
        assertEquals(60,plan.get("unitsSold").asInt());assertEquals(16,plan.get("reorderPoint").asInt());assertEquals(28,plan.get("suggestedQuantity").asInt());
        mvc.perform(put("/inventory/products/"+p.getId()+"/replenishment").header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content("{\"minimumStock\":-1,\"leadTimeDays\":366,\"coverageDays\":0}")).andExpect(status().isBadRequest());
        assertTrue(audit.findAll().stream().anyMatch(e->e.getActor().equals(owner.getUsername())&&e.getAction().equals("RESTOCK_SETTINGS_CHANGED")));
    }
    @Test void priceAndStockChangesKeepOwnerNamesAndBeforeAfterValues() throws Exception {
        User owner=staff(StaffRole.OWNER);Product p=product();
        mvc.perform(put("/inventory/products/"+p.getId()).header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content(body(Map.of("sku",p.getSku(),"name",p.getName(),"unitPrice",120,"capital",70)))).andExpect(status().isOk());
        mvc.perform(put("/inventory/products/"+p.getId()+"/stock").header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content("{\"stock\":12,\"movementType\":\"DAMAGE\",\"reason\":\"Broken valves\"}")).andExpect(status().isOk());
        var events=audit.findAll().stream().filter(e->e.getEntityId().equals(p.getId().toString())&&e.getActor().equals(owner.getUsername())).toList();
        assertTrue(events.stream().anyMatch(e->e.getAction().equals("PRICE_CHANGED")&&e.getDetails().contains("100.00 → 120")));
        assertTrue(events.stream().anyMatch(e->e.getAction().equals("STOCK_DAMAGE")&&e.getDetails().contains("16 → 12")&&e.getDetails().contains("Broken valves")));
        mvc.perform(delete("/inventory/products/"+p.getId()).header("Authorization",token(owner)).contentType(MediaType.APPLICATION_JSON).content(body(Map.of("password",password)))).andExpect(status().isNoContent());
    }
    @Test void tokensAreBoundToImmutableAccountIdsAndLegacySessionsMustSignInAgain() throws Exception {
        User owner=staff(StaffRole.OWNER), other=staff(StaffRole.CASHIER);
        String legacy="Bearer "+jwt.generateToken(owner.getUsername(), owner.getTokenVersion());
        mvc.perform(get("/auth/me").header("Authorization",legacy)).andExpect(status().isUnauthorized());
        String wrongId="Bearer "+jwt.generateToken(owner.getUsername(),owner.getTokenVersion(),other.getId());
        mvc.perform(get("/auth/me").header("Authorization",wrongId)).andExpect(status().isUnauthorized());
    }
}
