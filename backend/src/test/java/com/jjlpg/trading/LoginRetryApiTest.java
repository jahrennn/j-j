package com.jjlpg.trading;

import com.jjlpg.trading.config.GlobalExceptionHandler;
import com.jjlpg.trading.controller.AuthController;
import com.jjlpg.trading.dto.LoginResponse;
import com.jjlpg.trading.entity.StaffRole;
import com.jjlpg.trading.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LoginRetryApiTest {
    AuthService auth = mock(AuthService.class);
    MockMvc mvc = MockMvcBuilders.standaloneSetup(new AuthController(auth, new LoginAttemptService()))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    LoginRetryApiTest() {
        when(auth.login(any())).thenAnswer(invocation -> {
            var request = (com.jjlpg.trading.dto.LoginRequest)invocation.getArgument(0);
            if (!"correct-password".equals(request.password())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password.");
            StaffRole role = request.username().startsWith("driver") ? StaffRole.DRIVER
                    : request.username().startsWith("cashier") ? StaffRole.CASHIER : StaffRole.OWNER;
            return new LoginResponse("signed-test-token", request.username(), role);
        });
    }
    org.springframework.test.web.servlet.ResultActions login(String name, boolean correct) throws Exception {
        return mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\""+name+"\",\"password\":\""+(correct?"correct-password":"wrong-password")+"\"}"));
    }
    @Test void repeatedSuccessfulLoginsForAllRolesStayAvailable() throws Exception {
        for (int i = 0; i < 8; i++) for (String name : new String[]{"owner", "cashier", "driver"}) login(name, true).andExpect(status().isOk());
    }
    @Test void exhaustedAccountReturnsCooldownHeaderWithoutBlockingOtherAccounts() throws Exception {
        for (int i = 0; i < 5; i++) login("cashier-one", false).andExpect(status().isUnauthorized());
        login("cashier-one", true).andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "900"))
                .andExpect(jsonPath("$.message").value("Too many failed login attempts for this account. Please try again in 15 minutes."));
        login("cashier-two", true).andExpect(status().isOk());
        login("owner", true).andExpect(status().isOk());
        login("driver", true).andExpect(status().isOk());
    }
    @Test void successfulPasswordCheckResetsAccountRetries() throws Exception {
        for (int i = 0; i < 4; i++) login("owner", false).andExpect(status().isUnauthorized());
        login("owner", true).andExpect(status().isOk());
        for (int i = 0; i < 4; i++) login("owner", false).andExpect(status().isUnauthorized());
        login("owner", true).andExpect(status().isOk());
    }
}
