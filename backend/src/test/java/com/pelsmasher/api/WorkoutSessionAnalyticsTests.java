package com.pelsmasher.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WorkoutSessionAnalyticsTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void completeWorkoutReturnsVolumeAnalyticsComparedToPreviousSession() throws Exception {
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
        Map<String, Object> secondExercise = exercises.get(1);
        Map<String, Object> thirdExercise = exercises.get(2);

        postWorkout(token, Map.of(
            "id", "session-previous-" + UUID.randomUUID(),
            "muscleGroupId", muscleGroupId,
            "workoutSetId", optionId,
            "workoutSetName", optionName,
            "startedAt", "2026-08-20T10:00:00Z",
            "completedAt", "2026-08-20T10:45:00Z",
            "durationSeconds", 2700,
            "totalSets", 2,
            "exerciseResults", List.of(
                exerciseResult(firstExercise, List.of(set("p-1", 80, 8, "2026-08-20T10:10:00Z"))),
                exerciseResult(secondExercise, List.of(set("p-2", 90, 5, "2026-08-20T10:20:00Z")))
            )
        ))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.analytics.currentVolume").value(1090))
            .andExpect(jsonPath("$.analytics.previousVolume").value(0));

        MvcResult currentResult = postWorkout(token, Map.of(
            "id", "session-current-" + UUID.randomUUID(),
            "muscleGroupId", muscleGroupId,
            "workoutSetId", optionId,
            "workoutSetName", optionName,
            "startedAt", "2026-08-24T10:00:00Z",
            "completedAt", "2026-08-24T10:50:00Z",
            "durationSeconds", 3000,
            "totalSets", 4,
            "exerciseResults", List.of(
                exerciseResult(firstExercise, List.of(
                    set("c-1", 80, 8, "2026-08-24T10:10:00Z"),
                    set("c-2", 100, 5, "2026-08-24T10:16:00Z")
                )),
                exerciseResult(secondExercise, List.of(set("c-3", 80, 5, "2026-08-24T10:28:00Z"))),
                exerciseResult(thirdExercise, List.of(set("c-4", 50, 10, "2026-08-24T10:38:00Z")))
            )
        ))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.analytics.currentVolume").value(2040))
            .andExpect(jsonPath("$.analytics.previousVolume").value(1090))
            .andExpect(jsonPath("$.analytics.diff").value(950))
            .andExpect(jsonPath("$.analytics.currentSets").value(4))
            .andExpect(jsonPath("$.analytics.previousSets").value(2))
            .andReturn();

        String response = currentResult.getResponse().getContentAsString();
        assertThat((String) JsonPath.read(response, "$.analytics.verdict"))
            .contains("Overall volume improved by 950 kg");
        assertThat(exerciseAnalyticsDiff(response, stringValue(firstExercise, "name"))).isEqualByComparingTo("500");
        assertThat(exerciseAnalyticsDiff(response, stringValue(secondExercise, "name"))).isEqualByComparingTo("-50");
        assertThat(exerciseAnalyticsDiff(response, stringValue(thirdExercise, "name"))).isEqualByComparingTo("500");
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
        String email = "analytics-" + UUID.randomUUID() + "@example.com";
        MvcResult result = mockMvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of(
                        "username", "analytics-" + UUID.randomUUID(),
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

    private static java.math.BigDecimal exerciseAnalyticsDiff(String response, String exerciseName) {
        List<Number> values = JsonPath.read(
            response,
            "$.analytics.exercises[?(@.name == '" + exerciseName + "')].diff"
        );
        return new java.math.BigDecimal(values.getFirst().toString());
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
