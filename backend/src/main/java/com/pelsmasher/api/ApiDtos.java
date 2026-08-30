package com.pelsmasher.api;

import com.pelsmasher.domain.MuscleKey;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record HealthResponse(String status) {
    }

    public record RegisterRequest(
        String username,
        @NotBlank String email,
        @NotBlank String password,
        @NotBlank String repeatPassword
    ) {
    }

    public record LoginRequest(
        @NotBlank String email,
        @NotBlank String password
    ) {
    }

    public record AuthUserResponse(
        String id,
        String email,
        String username
    ) {
    }

    public record AuthResponse(
        String token,
        AuthUserResponse user
    ) {
    }

    public record MuscleGroupResponse(
        String id,
        String name,
        MuscleKey muscleKey,
        String imageSrc,
        boolean preset
    ) {
    }

    public record CreateMuscleGroupRequest(
        @NotBlank String name,
        MuscleKey muscleKey,
        String imageSrc
    ) {
    }

    public record UpdateMuscleGroupRequest(
        String name,
        MuscleKey muscleKey,
        String imageSrc
    ) {
    }

    public record ExerciseResponse(
        String id,
        String name,
        Integer supersetGroup
    ) {
    }

    public record TrainingOptionResponse(
        String id,
        String muscleGroupId,
        String name,
        List<ExerciseResponse> exercises,
        boolean defaultOption,
        int completedSessions
    ) {
    }

    public record ExerciseInput(
        @NotBlank String name,
        Integer supersetGroup
    ) {
    }

    public record CreateTrainingOptionRequest(
        @NotBlank String muscleGroupId,
        @NotBlank String name,
        @Valid @NotEmpty List<ExerciseInput> exercises
    ) {
    }

    public record UpdateTrainingOptionRequest(
        String name,
        @Valid List<ExerciseInput> exercises
    ) {
    }

    public record LoggedSetRequest(
        String id,
        @NotBlank String exerciseId,
        String exerciseName,
        @NotNull @PositiveOrZero BigDecimal weight,
        @PositiveOrZero int reps,
        @NotNull Instant performedAt
    ) {
    }

    public record ExerciseResultRequest(
        @NotBlank String exerciseId,
        @NotBlank String exerciseName,
        @Valid List<LoggedSetRequest> sets
    ) {
    }

    public record CompleteWorkoutRequest(
        String id,
        @NotBlank String muscleGroupId,
        @NotBlank String workoutSetId,
        @NotBlank String workoutSetName,
        @NotNull Instant startedAt,
        @NotNull Instant completedAt,
        @PositiveOrZero int durationSeconds,
        @PositiveOrZero int totalSets,
        @Valid List<ExerciseResultRequest> exerciseResults
    ) {
    }

    public record LoggedSetResponse(
        String id,
        String exerciseId,
        String exerciseName,
        int setNumber,
        BigDecimal weight,
        int reps,
        BigDecimal volume,
        Instant performedAt
    ) {
    }

    public record WorkoutSessionResponse(
        String id,
        String muscleGroupId,
        String workoutSetId,
        String workoutSetName,
        Instant startedAt,
        Instant completedAt,
        int durationSeconds,
        int totalSets,
        BigDecimal totalVolume,
        List<LoggedSetResponse> sets
    ) {
    }

    public record WorkoutAnalyticsExerciseResponse(
        String name,
        int currentSets,
        int previousSets,
        BigDecimal currentVolume,
        BigDecimal previousVolume,
        BigDecimal diff,
        BigDecimal currentBestWeight,
        BigDecimal previousBestWeight
    ) {
    }

    public record WorkoutAnalyticsResponse(
        String workoutSetName,
        Instant completedAt,
        int durationSeconds,
        int currentSets,
        int previousSets,
        BigDecimal currentVolume,
        BigDecimal previousVolume,
        BigDecimal diff,
        String verdict,
        List<WorkoutAnalyticsExerciseResponse> exercises
    ) {
    }

    public record CompleteWorkoutResponse(
        WorkoutSessionResponse session,
        WorkoutAnalyticsResponse analytics
    ) {
    }

    public record WorkoutSessionSummaryResponse(
        String id,
        String workoutSetName,
        Instant completedAt,
        int totalSets,
        BigDecimal totalVolume
    ) {
    }
}
