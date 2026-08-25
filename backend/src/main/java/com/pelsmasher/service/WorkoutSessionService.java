package com.pelsmasher.service;

import com.pelsmasher.api.ApiDtos.CompleteWorkoutRequest;
import com.pelsmasher.api.ApiDtos.CompleteWorkoutResponse;
import com.pelsmasher.api.ApiDtos.ExerciseResultRequest;
import com.pelsmasher.api.ApiDtos.LoggedSetRequest;
import com.pelsmasher.api.ApiDtos.LoggedSetResponse;
import com.pelsmasher.api.ApiDtos.WorkoutAnalyticsExerciseResponse;
import com.pelsmasher.api.ApiDtos.WorkoutAnalyticsResponse;
import com.pelsmasher.api.ApiDtos.WorkoutSessionResponse;
import com.pelsmasher.domain.ExerciseEntity;
import com.pelsmasher.domain.LoggedSetEntity;
import com.pelsmasher.domain.TrainingOptionEntity;
import com.pelsmasher.domain.WorkoutSessionEntity;
import com.pelsmasher.repository.ExerciseRepository;
import com.pelsmasher.repository.LoggedSetRepository;
import com.pelsmasher.repository.TrainingOptionRepository;
import com.pelsmasher.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkoutSessionService {

    private final WorkoutSessionRepository workoutSessions;
    private final LoggedSetRepository loggedSets;
    private final TrainingOptionRepository trainingOptions;
    private final ExerciseRepository exercises;
    private final LocalUserService localUserService;

    public WorkoutSessionService(
        WorkoutSessionRepository workoutSessions,
        LoggedSetRepository loggedSets,
        TrainingOptionRepository trainingOptions,
        ExerciseRepository exercises,
        LocalUserService localUserService
    ) {
        this.workoutSessions = workoutSessions;
        this.loggedSets = loggedSets;
        this.trainingOptions = trainingOptions;
        this.exercises = exercises;
        this.localUserService = localUserService;
    }

    @Transactional
    public CompleteWorkoutResponse completeWorkout(CompleteWorkoutRequest request) {
        String userId = localUserService.ensureLocalUser().getId();
        TrainingOptionEntity trainingOption = trainingOptions.findById(request.workoutSetId())
            .filter(option -> userId.equals(option.getUserId()))
            .orElseThrow(() -> new NotFoundException("Training option not found: " + request.workoutSetId()));
        WorkoutSessionEntity previousSession = workoutSessions
            .findFirstByUserIdAndTrainingOptionIdOrderByCompletedAtDesc(userId, trainingOption.getId())
            .orElse(null);

        WorkoutSessionEntity session = new WorkoutSessionEntity(
            request.id(),
            userId,
            request.muscleGroupId(),
            trainingOption.getId(),
            request.workoutSetName(),
            request.startedAt(),
            request.completedAt(),
            request.durationSeconds(),
            request.totalSets()
        );

        for (ExerciseResultRequest exerciseResult : safeList(request.exerciseResults())) {
            int setNumber = 1;
            for (LoggedSetRequest set : safeList(exerciseResult.sets())) {
                String exerciseName = hasText(set.exerciseName())
                    ? set.exerciseName()
                    : exerciseResult.exerciseName();
                ExerciseEntity exercise = resolveExercise(userId, set.exerciseId(), exerciseName);

                session.addLoggedSet(new LoggedSetEntity(
                    set.id(),
                    session,
                    exercise.getId(),
                    exerciseName,
                    setNumber,
                    set.weight(),
                    set.reps(),
                    set.performedAt()
                ));
                setNumber++;
            }
        }

        WorkoutSessionEntity savedSession = workoutSessions.save(session);
        WorkoutSessionResponse sessionResponse = toResponse(savedSession);

        return new CompleteWorkoutResponse(
            sessionResponse,
            buildAnalytics(savedSession, trainingOption, previousSession)
        );
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionResponse> listTrainingOptionHistory(String trainingOptionId) {
        String userId = localUserService.ensureLocalUser().getId();

        return workoutSessions.findTop20ByUserIdAndTrainingOptionIdOrderByCompletedAtDesc(userId, trainingOptionId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<LoggedSetResponse> listExerciseHistory(String exerciseId) {
        return loggedSets.findTop20ByExerciseIdOrderByPerformedAtDesc(exerciseId)
            .stream()
            .map(this::toLoggedSetResponse)
            .toList();
    }

    private WorkoutSessionResponse toResponse(WorkoutSessionEntity session) {
        List<LoggedSetResponse> setResponses = session.getLoggedSets()
            .stream()
            .sorted(Comparator.comparing(LoggedSetEntity::getPerformedAt))
            .map(this::toLoggedSetResponse)
            .toList();

        return new WorkoutSessionResponse(
            session.getId(),
            session.getMuscleGroupId(),
            session.getTrainingOptionId(),
            session.getTrainingOptionName(),
            session.getStartedAt(),
            session.getCompletedAt(),
            session.getDurationSeconds(),
            session.getTotalSets(),
            sessionVolume(session),
            setResponses
        );
    }

    private WorkoutAnalyticsResponse buildAnalytics(
        WorkoutSessionEntity currentSession,
        TrainingOptionEntity trainingOption,
        WorkoutSessionEntity previousSession
    ) {
        BigDecimal currentVolume = sessionVolume(currentSession);
        BigDecimal previousVolume = previousSession == null
            ? BigDecimal.ZERO
            : sessionVolume(previousSession);
        BigDecimal diff = currentVolume.subtract(previousVolume);
        List<WorkoutAnalyticsExerciseResponse> exercises = trainingOption.getExercises()
            .stream()
            .map(optionExercise -> {
                String exerciseId = optionExercise.getExercise().getId();
                String exerciseName = optionExercise.getExercise().getName();
                List<LoggedSetEntity> currentSets = exerciseSets(currentSession, exerciseId, exerciseName);
                List<LoggedSetEntity> previousSets = previousSession == null
                    ? List.of()
                    : exerciseSets(previousSession, exerciseId, exerciseName);
                BigDecimal currentExerciseVolume = setVolume(currentSets);
                BigDecimal previousExerciseVolume = setVolume(previousSets);

                return new WorkoutAnalyticsExerciseResponse(
                    exerciseName,
                    currentSets.size(),
                    previousSets.size(),
                    currentExerciseVolume,
                    previousExerciseVolume,
                    currentExerciseVolume.subtract(previousExerciseVolume),
                    bestWeight(currentSets),
                    bestWeight(previousSets)
                );
            })
            .toList();

        return new WorkoutAnalyticsResponse(
            currentSession.getTrainingOptionName(),
            currentSession.getCompletedAt(),
            currentSession.getDurationSeconds(),
            currentSession.getTotalSets(),
            previousSession == null ? 0 : previousSession.getTotalSets(),
            currentVolume,
            previousVolume,
            diff,
            buildVerdict(previousSession, diff, exercises),
            exercises
        );
    }

    private static String buildVerdict(
        WorkoutSessionEntity previousSession,
        BigDecimal diff,
        List<WorkoutAnalyticsExerciseResponse> exercises
    ) {
        if (previousSession == null) {
            return "First saved workout for this option. This is now your baseline.";
        }

        int improvedCount = (int) exercises.stream()
            .filter(exercise -> exercise.diff().compareTo(BigDecimal.ZERO) > 0)
            .count();
        int worsenedCount = (int) exercises.stream()
            .filter(exercise -> exercise.diff().compareTo(BigDecimal.ZERO) < 0)
            .count();

        if (diff.compareTo(BigDecimal.ZERO) > 0) {
            return "Overall volume improved by " + formatVolume(diff) + ". " + improvedCount
                + " exercise" + (improvedCount == 1 ? "" : "s") + " up.";
        }
        if (diff.compareTo(BigDecimal.ZERO) < 0) {
            return "Overall volume dropped by " + formatVolume(diff.abs()) + ". " + worsenedCount
                + " exercise" + (worsenedCount == 1 ? "" : "s") + " down.";
        }

        return "Overall volume matched the previous workout.";
    }

    private static BigDecimal sessionVolume(WorkoutSessionEntity session) {
        return setVolume(session.getLoggedSets());
    }

    private static BigDecimal setVolume(List<LoggedSetEntity> sets) {
        return sets.stream()
            .map(WorkoutSessionService::setVolume)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal setVolume(LoggedSetEntity set) {
        return set.getWeight().multiply(BigDecimal.valueOf(set.getReps()));
    }

    private static BigDecimal bestWeight(List<LoggedSetEntity> sets) {
        return sets.stream()
            .map(LoggedSetEntity::getWeight)
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);
    }

    private static List<LoggedSetEntity> exerciseSets(
        WorkoutSessionEntity session,
        String exerciseId,
        String exerciseName
    ) {
        return session.getLoggedSets()
            .stream()
            .filter(set ->
                exerciseId.equals(set.getExerciseId()) ||
                    Objects.equals(normalize(set.getExerciseName()), normalize(exerciseName))
            )
            .sorted(Comparator.comparing(LoggedSetEntity::getSetNumber))
            .toList();
    }

    private static String formatVolume(BigDecimal value) {
        return formatMetric(value) + " kg";
    }

    private static String formatMetric(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() <= 0 ? stripped.toPlainString() : stripped.toPlainString();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private LoggedSetResponse toLoggedSetResponse(LoggedSetEntity set) {
        return new LoggedSetResponse(
            set.getId(),
            set.getExerciseId(),
            set.getExerciseName(),
            set.getSetNumber(),
            set.getWeight(),
            set.getReps(),
            setVolume(set),
            set.getPerformedAt()
        );
    }

    private static <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }

    private ExerciseEntity resolveExercise(String userId, String exerciseId, String exerciseName) {
        return exercises.findById(exerciseId)
            .filter(exercise -> userId.equals(exercise.getUserId()))
            .orElseGet(() -> resolveExerciseByName(userId, exerciseName));
    }

    private ExerciseEntity resolveExerciseByName(String userId, String exerciseName) {
        String normalizedName = ExerciseEntity.normalize(exerciseName);

        return exercises.findByUserIdAndNormalizedNameAndArchivedFalse(userId, normalizedName)
            .orElseGet(() -> exercises.save(new ExerciseEntity(userId, exerciseName)));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
