package com.pelsmasher.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerCreatesUserTokenAndSeededCatalog() throws Exception {
        String email = uniqueEmail();

        MvcResult result = register(email, "secret123", "secret123")
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.user.id").isString())
            .andExpect(jsonPath("$.user.email").value(email))
            .andExpect(jsonPath("$.user.displayName").value(email))
            .andReturn();

        String token = tokenFrom(result);

        mockMvc.perform(get("/api/muscle-groups").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9))
            .andExpect(jsonPath("$[0].name").value("Chest"));
    }

    @Test
    void loginReturnsNewTokenForExistingUserWithCaseInsensitiveEmail() throws Exception {
        String email = uniqueEmail();
        MvcResult registerResult = register(email, "secret123", "secret123")
            .andExpect(status().isCreated())
            .andReturn();

        MvcResult loginResult = login(email.toUpperCase(), "secret123")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.user.email").value(email))
            .andReturn();

        String registerToken = tokenFrom(registerResult);
        String loginToken = tokenFrom(loginResult);

        org.assertj.core.api.Assertions.assertThat(loginToken).isNotEqualTo(registerToken);
    }

    @Test
    void registerRejectsDuplicateEmailIgnoringCase() throws Exception {
        String email = uniqueEmail();
        register(email, "secret123", "secret123").andExpect(status().isCreated());

        register(email.toUpperCase(), "secret123", "secret123")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Email is already registered"));
    }

    @Test
    void registerRejectsMismatchedPassword() throws Exception {
        register(uniqueEmail(), "secret123", "secret456")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Passwords do not match"));
    }

    @Test
    void registerRejectsShortPassword() throws Exception {
        register(uniqueEmail(), "short", "short")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Password must be at least 6 characters"));
    }

    @Test
    void registerRejectsInvalidEmail() throws Exception {
        register("najel", "secret123", "secret123")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Email is invalid"));
    }

    @Test
    void loginRejectsWrongPasswordWithUnauthorized() throws Exception {
        String email = uniqueEmail();
        register(email, "secret123", "secret123").andExpect(status().isCreated());

        login(email, "wrong-password")
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Email or password is incorrect"));
    }

    @Test
    void bearerTokenKeepsUserCatalogsSeparated() throws Exception {
        String firstToken = tokenFrom(register(uniqueEmail(), "secret123", "secret123")
            .andExpect(status().isCreated())
            .andReturn());
        String secondToken = tokenFrom(register(uniqueEmail(), "secret123", "secret123")
            .andExpect(status().isCreated())
            .andReturn());

        mockMvc.perform(
                post("/api/muscle-groups")
                    .header("Authorization", "Bearer " + firstToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "name", "Private Test Muscle",
                        "muscleKey", "CUSTOM"
                    )))
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Private Test Muscle"));

        mockMvc.perform(get("/api/muscle-groups").header("Authorization", "Bearer " + firstToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(10))
            .andExpect(content().string(containsString("Private Test Muscle")));

        mockMvc.perform(get("/api/muscle-groups").header("Authorization", "Bearer " + secondToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(9))
            .andExpect(content().string(not(containsString("Private Test Muscle"))));
    }

    private org.springframework.test.web.servlet.ResultActions register(
        String email,
        String password,
        String repeatPassword
    ) throws Exception {
        return mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", email,
                    "password", password,
                    "repeatPassword", repeatPassword
                )))
        );
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", email,
                    "password", password
                )))
        );
    }

    private static String tokenFrom(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }
}
