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
class WorkoutSessionSummaryTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void listSessionsReturnsSessionsAcrossAllTrainingOptionsSinceGivenInstant() throws Exception {
        String token = registerAndToken();
        Map<String, Object> chest = firstItem(getJson("/api/muscle-groups", token));
        String muscleGroupId = stringValue(chest, "id");
        List<Map<String, Object>> options = getJson(
            "/api/muscle-groups/" + muscleGroupId + "/training-options",
            token
        );
        Map<String, Object> option = options.getFirst();
        String optionId = stringValue(option, "id");
        String optionName = stringValue(option, "name");
        List<Map<String, Object>> exercises = listValue(option, "exercises");
        Map<String, Object> firstExercise = exercises.get(0);

        postWorkout(token, Map.of(
            "id", "session-old-" + UUID.randomUUID(),
            "muscleGroupId", muscleGroupId,
            "workoutSetId", optionId,
            "workoutSetName", optionName,
            "startedAt", "2026-06-01T10:00:00Z",
            "completedAt", "2026-06-01T10:45:00Z",
            "durationSeconds", 2700,
            "totalSets", 1,
            "exerciseResults", List.of(
                exerciseResult(firstExercise, List.of(set("old-1", 60, 10, "2026-06-01T10:10:00Z")))
            )
        )).andExpect(status().isCreated());

        postWorkout(token, Map.of(
            "id", "session-recent-" + UUID.randomUUID(),
            "muscleGroupId", muscleGroupId,
            "workoutSetId", optionId,
            "workoutSetName", optionName,
            "startedAt", "2026-08-28T10:00:00Z",
            "completedAt", "2026-08-28T10:45:00Z",
            "durationSeconds", 2700,
            "totalSets", 1,
            "exerciseResults", List.of(
                exerciseResult(firstExercise, List.of(set("recent-1", 70, 8, "2026-08-28T10:10:00Z")))
            )
        )).andExpect(status().isCreated());

        MvcResult result = mockMvc.perform(
                get("/api/workout-sessions")
                    .param("since", "2026-08-01T00:00:00Z")
                    .header("Authorization", "Bearer " + token)
            )
            .andExpect(status().isOk())
            .andReturn();

        String response = result.getResponse().getContentAsString();
        List<Map<String, Object>> sessions = JsonPath.read(response, "$");

        assertThat(sessions).hasSize(1);
        assertThat(new java.math.BigDecimal(stringValue(sessions.getFirst(), "totalVolume")))
            .isEqualByComparingTo("560");
    }

    @Test
    void listSessionsExcludesOtherUsersSessions() throws Exception {
        String tokenA = registerAndToken();
        String tokenB = registerAndToken();
        Map<String, Object> chest = firstItem(getJson("/api/muscle-groups", tokenA));
        String muscleGroupId = stringValue(chest, "id");
        List<Map<String, Object>> options = getJson(
            "/api/muscle-groups/" + muscleGroupId + "/training-options",
            tokenA
        );
        Map<String, Object> option = options.getFirst();
        String optionId = stringValue(option, "id");
        String optionName = stringValue(option, "name");
        Map<String, Object> firstExercise = listValue(option, "exercises").get(0);

        postWorkout(tokenA, Map.of(
            "id", "session-a-" + UUID.randomUUID(),
            "muscleGroupId", muscleGroupId,
            "workoutSetId", optionId,
            "workoutSetName", optionName,
            "startedAt", "2026-08-28T10:00:00Z",
            "completedAt", "2026-08-28T10:45:00Z",
            "durationSeconds", 2700,
            "totalSets", 1,
            "exerciseResults", List.of(
                exerciseResult(firstExercise, List.of(set("a-1", 70, 8, "2026-08-28T10:10:00Z")))
            )
        )).andExpect(status().isCreated());

        List<Map<String, Object>> sessionsForB = getJson(
            "/api/workout-sessions?since=2026-01-01T00:00:00Z",
            tokenB
        );

        assertThat(sessionsForB).isEmpty();
    }

    private org.springframework.test.web.servlet.ResultActions postWorkout(
        String token,
        Map<String, Object> payload
    ) throws Exception {
        return mockMvc.perform(
            post("/api/workout-sessions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload))
        );
    }

    private String registerAndToken() throws Exception {
        String email = "summary-" + UUID.randomUUID() + "@example.com";
        MvcResult result = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "username", "summary-" + UUID.randomUUID(),
                        "email", email,
                        "password", "secret123",
                        "repeatPassword", "secret123"
                    )))
            )
            .andExpect(status().isCreated())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private List<Map<String, Object>> getJson(String path, String token) throws Exception {
        MvcResult result = mockMvc.perform(get(path).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$");
    }

    private static Map<String, Object> exerciseResult(
        Map<String, Object> exercise,
        List<Map<String, Object>> sets
    ) {
        return Map.of(
            "exerciseId", stringValue(exercise, "id"),
            "exerciseName", stringValue(exercise, "name"),
            "sets", sets
        );
    }

    private static Map<String, Object> set(String id, int weight, int reps, String performedAt) {
        return Map.of(
            "id", id,
            "exerciseId", "unused-by-backend-when-exercise-result-has-id",
            "weight", weight,
            "reps", reps,
            "performedAt", performedAt
        );
    }

    private static Map<String, Object> firstItem(List<Map<String, Object>> values) {
        return values.getFirst();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> listValue(Map<String, Object> value, String key) {
        return (List<Map<String, Object>>) value.get(key);
    }

    private static String stringValue(Map<String, Object> value, String key) {
        return String.valueOf(value.get(key));
    }
}
