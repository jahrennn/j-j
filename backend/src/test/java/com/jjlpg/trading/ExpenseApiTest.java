package com.jjlpg.trading;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjlpg.trading.dto.CreateExpenseRequest;
import com.jjlpg.trading.dto.ExpenseDto;
import com.jjlpg.trading.entity.ExpenseCategory;
import com.jjlpg.trading.entity.Sale;
import com.jjlpg.trading.repository.ExpenseRepository;
import com.jjlpg.trading.repository.SaleRepository;
import com.jjlpg.trading.service.ExpenseService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
class ExpenseApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ExpenseService service;
    @Autowired ExpenseRepository expenses;
    @Autowired SaleRepository sales;

    JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    String payload(UUID id, String date, String category, String amount, String paidTo) throws Exception {
        return mapper.writeValueAsString(Map.of("requestId", id.toString(), "expenseDate", date,
                "category", category, "description", " Delivery operating cost ",
                "amount", new BigDecimal(amount), "paidTo", paidTo, "notes", " Receipt 123 "));
    }

    JsonNode record(String date, String category, String amount, String paidTo) throws Exception {
        return json(mvc.perform(post("/expenses").with(user("admin")).contentType(MediaType.APPLICATION_JSON)
                .content(payload(UUID.randomUUID(), date, category, amount, paidTo)))
                .andExpect(status().isOk()).andReturn());
    }

    JsonNode list(String query) throws Exception {
        return json(mvc.perform(get("/expenses" + query).with(user("admin")))
                .andExpect(status().isOk()).andReturn());
    }

    JsonNode profit(String query) throws Exception {
        return json(mvc.perform(get("/expenses/profit" + query).with(user("admin")))
                .andExpect(status().isOk()).andReturn());
    }

    void amount(String expected, JsonNode actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual.decimalValue()), actual.toString());
    }

    @Test void summariesCoverAllPagesAndFiltersRetainVoidedHistory() throws Exception {
        JsonNode fuel = record("2091-01-10", "FUEL", "125.35", " Station ");
        record("2091-01-11", "SALARY", "500.25", " Driver A ");
        record("2091-01-12", "OTHER", "10.10", "");
        record("2090-12-31", "FUEL", "99", "");
        String dates = "?startDate=2091-01-01&endDate=2091-01-31";
        JsonNode all = list(dates + "&size=1");
        assertEquals(1, all.at("/records/content").size());
        assertEquals(3, all.at("/records/totalElements").asInt());
        amount("635.70", all.at("/summary/totalAmount"));
        amount("125.35", all.at("/summary/fuelAmount"));
        amount("500.25", all.at("/summary/salaryAmount"));
        amount("10.10", all.at("/summary/otherAmount"));
        assertEquals("Delivery operating cost", fuel.get("description").asText());
        assertEquals("Station", fuel.get("paidTo").asText());
        amount("125.35", list(dates + "&category=FUEL").at("/summary/totalAmount"));
        assertEquals(3, list("?startDate=2091-01-01").at("/records/totalElements").asInt());
        assertEquals(4, list("?endDate=2091-01-31").at("/records/totalElements").asInt());

        String path = "/expenses/" + fuel.get("id").asLong() + "/void";
        JsonNode firstVoid = json(mvc.perform(post(path).with(user("admin")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\" Duplicate receipt \"}")).andExpect(status().isOk()).andReturn());
        JsonNode retry = json(mvc.perform(post(path).with(user("another-user")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Different reason\"}")).andExpect(status().isOk()).andReturn());
        assertEquals("VOIDED", retry.get("status").asText());
        assertEquals("Duplicate receipt", retry.get("voidReason").asText());
        assertEquals("admin", retry.get("voidedBy").asText());
        assertEquals(firstVoid.get("voidedAt"), retry.get("voidedAt"));
        JsonNode after = list(dates);
        assertEquals(3, after.at("/records/totalElements").asInt());
        assertEquals(2, after.at("/summary/recordedCount").asInt());
        amount("510.35", after.at("/summary/totalAmount"));
    }

    @Test void expenseDateControlsProfitMonthAndLossesAreAllowed() throws Exception {
        Sale sale = new Sale();
        sale.setSaleDate(LocalDate.parse("2092-02-10"));
        sale.setTransactionId(UUID.randomUUID().toString());
        sale.setQuantity(2);
        sale.setTotalAmount(new BigDecimal("1000.00"));
        sale.setCapital(new BigDecimal("600.00"));
        sales.saveAndFlush(sale);
        record("2092-01-31", "FUEL", "50", "");
        JsonNode fuel = record("2092-02-01", "FUEL", "100", "");
        record("2092-02-28", "SALARY", "200", "Driver");
        String feb = "?startDate=2092-02-01&endDate=2092-02-29";
        JsonNode result = profit(feb);
        amount("400", result.get("grossProfit"));
        amount("300", result.get("operatingExpenses"));
        amount("100", result.get("netProfit"));
        amount("-50", profit("?startDate=2092-01-01&endDate=2092-01-31").get("netProfit"));
        mvc.perform(post("/expenses/" + fuel.get("id").asLong() + "/void").with(user("admin"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Incorrect amount\"}"))
                .andExpect(status().isOk());
        amount("200", profit(feb).get("netProfit"));
        record("2092-02-29", "MAINTENANCE", "500", "Mechanic");
        amount("-300", profit(feb).get("netProfit"));
        amount("600", mapper.valueToTree(sales.findById(sale.getId()).orElseThrow().getCapital()));
    }

    @Test void defaultProfitUsesCurrentPhilippineCalendarMonth() throws Exception {
        var month = YearMonth.now(ZoneId.of("Asia/Manila"));
        JsonNode result = profit("");
        assertEquals(month.atDay(1).toString(), result.get("startDate").asText());
        assertEquals(month.atEndOfMonth().toString(), result.get("endDate").asText());
        var before = result.get("netProfit").decimalValue();
        record(month.atDay(1).toString(), "UTILITIES", "37.25", "");
        amount(before.subtract(new BigDecimal("37.25")).toPlainString(), profit("").get("netProfit"));
    }

    @Test void retryDoesNotDuplicateExpenseAndChangedRetryConflicts() throws Exception {
        UUID id = UUID.randomUUID();
        String body = payload(id, "2093-03-01", "FUEL", "10.50", "");
        JsonNode first = json(mvc.perform(post("/expenses").with(user("admin"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andReturn());
        JsonNode retry = json(mvc.perform(post("/expenses").with(user("admin"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk()).andReturn());
        assertEquals(first.get("id"), retry.get("id"));
        assertEquals(1, list("?startDate=2093-03-01&endDate=2093-03-01").at("/summary/recordedCount").asInt());
        mvc.perform(post("/expenses").with(user("admin")).contentType(MediaType.APPLICATION_JSON)
                .content(payload(id, "2093-03-01", "FUEL", "11.50", ""))).andExpect(status().isConflict());
    }

    @Test void malformedAndInvalidRequestsAreRejected() throws Exception {
        for (String value : new String[]{"0", "-1", "1.001", "10000000000"}) {
            mvc.perform(post("/expenses").with(user("admin")).contentType(MediaType.APPLICATION_JSON)
                    .content(payload(UUID.randomUUID(), "2094-01-01", "FUEL", value, "")))
                    .andExpect(status().isBadRequest());
        }
        for (String body : new String[]{"{}", "{\"requestId\":\"bad-id\"}",
                payload(UUID.randomUUID(), "2094-01-01", "SALARY", "10", " "),
                payload(UUID.randomUUID(), "2094-01-01", "BAD", "10", ""),
                payload(UUID.randomUUID(), "bad-date", "FUEL", "10", "")}) {
            mvc.perform(post("/expenses").with(user("admin")).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        for (String path : new String[]{"/expenses?size=101", "/expenses?page=-1", "/expenses?category=BAD",
                "/expenses?startDate=2094-02-01&endDate=2094-01-01", "/expenses/profit?startDate=2094-01-01",
                "/expenses/profit?startDate=2094-02-01&endDate=2094-01-01"}) {
            mvc.perform(get(path).with(user("admin"))).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/expenses/9223372036854775807/void").with(user("admin"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Missing\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/expenses/1/void").with(user("admin"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\" \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void allExpenseEndpointsRequireAuthentication() throws Exception {
        mvc.perform(get("/expenses")).andExpect(status().isUnauthorized());
        mvc.perform(get("/expenses/profit")).andExpect(status().isUnauthorized());
        mvc.perform(post("/expenses").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/expenses/1/void").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void simultaneousRetriesCreateOneExpense() throws Exception {
        UUID id = UUID.randomUUID();
        var request = new CreateExpenseRequest(id, LocalDate.parse("2098-01-01"), ExpenseCategory.FUEL,
                "Concurrent receipt", new BigDecimal("25.55"), null, null);
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<ExpenseDto> task = () -> { start.await(); return service.recordExpense(request, "admin"); };
        try {
            var a = executor.submit(task);
            var b = executor.submit(task);
            start.countDown();
            assertEquals(a.get(15, TimeUnit.SECONDS).id(), b.get(15, TimeUnit.SECONDS).id());
            assertTrue(expenses.findByRequestId(id).isPresent());
        } finally {
            executor.shutdownNow();
            expenses.findByRequestId(id).ifPresent(expenses::delete);
        }
    }
}
