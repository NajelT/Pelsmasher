package com.pelsmasher.api;

import com.pelsmasher.api.ApiDtos.CompleteWorkoutRequest;
import com.pelsmasher.api.ApiDtos.CompleteWorkoutResponse;
import com.pelsmasher.api.ApiDtos.LoggedSetResponse;
import com.pelsmasher.api.ApiDtos.WorkoutSessionResponse;
import com.pelsmasher.api.ApiDtos.WorkoutSessionSummaryResponse;
import com.pelsmasher.service.WorkoutSessionService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class WorkoutSessionController {

    private final WorkoutSessionService workoutSessionService;

    public WorkoutSessionController(WorkoutSessionService workoutSessionService) {
        this.workoutSessionService = workoutSessionService;
    }

    @PostMapping("/workout-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    CompleteWorkoutResponse completeWorkout(@Valid @RequestBody CompleteWorkoutRequest request) {
        return workoutSessionService.completeWorkout(request);
    }

    @GetMapping("/workout-sessions")
    List<WorkoutSessionSummaryResponse> listSessions(@RequestParam("since") String since) {
        return workoutSessionService.listSessionsSince(Instant.parse(since));
    }

    @GetMapping("/training-options/{trainingOptionId}/history")
    List<WorkoutSessionResponse> trainingOptionHistory(@PathVariable String trainingOptionId) {
        return workoutSessionService.listTrainingOptionHistory(trainingOptionId);
    }

    @GetMapping("/exercises/{exerciseId}/history")
    List<LoggedSetResponse> exerciseHistory(@PathVariable String exerciseId) {
        return workoutSessionService.listExerciseHistory(exerciseId);
    }
}
