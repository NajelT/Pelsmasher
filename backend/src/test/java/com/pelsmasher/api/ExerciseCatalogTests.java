package com.pelsmasher.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ExerciseCatalogTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createExerciseAddsItToTheListAndIsIdempotentForTheSameName() throws Exception {
        String token = registerAndToken();
        String name = "Zercher Squat " + UUID.randomUUID();

        String firstId = createExercise(token, name);
        String secondId = createExercise(token, "  " + name.toUpperCase() + " ");

        assertThat(secondId).isEqualTo(firstId);

        List<String> names = listNames(token);
        assertThat(names.stream().filter(n -> n.equalsIgnoreCase(name)).count()).isEqualTo(1);
    }

    @Test
    void listExercisesContainsOnlyTheCurrentUsersExercises() throws Exception {
        String tokenA = registerAndToken();
        String tokenB = registerAndToken();
        String name = "Private Lift " + UUID.randomUUID();

        createExercise(tokenA, name);

        assertThat(listNames(tokenA)).contains(name);
        assertThat(listNames(tokenB)).doesNotContain(name);
    }

    @Test
    void createExerciseRejectsBlankName() throws Exception {
        String token = registerAndToken();

        mockMvc.perform(
                post("/api/exercises")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("name", "   ")))
            )
            .andExpect(status().isBadRequest());
    }

    private String createExercise(String token, String name) throws Exception {
        MvcResult result = mockMvc.perform(
                post("/api/exercises")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("name", name)))
            )
            .andExpect(status().isCreated())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private List<String> listNames(String token) throws Exception {
        MvcResult result = mockMvc.perform(
                get("/api/exercises").header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$[*].name");
    }

    private String registerAndToken() throws Exception {
        MvcResult result = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "username", "exercise-" + UUID.randomUUID(),
                        "email", "exercise-" + UUID.randomUUID() + "@example.com",
                        "password", "secret123",
                        "repeatPassword", "secret123"
                    )))
            )
            .andExpect(status().isCreated())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }
}
