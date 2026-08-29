package com.pelsmasher.service;

import com.pelsmasher.api.ApiDtos.CreateMuscleGroupRequest;
import com.pelsmasher.api.ApiDtos.CreateTrainingOptionRequest;
import com.pelsmasher.api.ApiDtos.ExerciseInput;
import com.pelsmasher.api.ApiDtos.ExerciseResponse;
import com.pelsmasher.api.ApiDtos.MuscleGroupResponse;
import com.pelsmasher.api.ApiDtos.TrainingOptionResponse;
import com.pelsmasher.api.ApiDtos.UpdateMuscleGroupRequest;
import com.pelsmasher.api.ApiDtos.UpdateTrainingOptionRequest;
import com.pelsmasher.domain.ExerciseEntity;
import com.pelsmasher.domain.MuscleGroupEntity;
import com.pelsmasher.domain.MuscleKey;
import com.pelsmasher.domain.TrainingOptionEntity;
import com.pelsmasher.repository.ExerciseRepository;
import com.pelsmasher.repository.MuscleGroupRepository;
import com.pelsmasher.repository.TrainingOptionRepository;
import com.pelsmasher.repository.WorkoutSessionRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {

    private final MuscleGroupRepository muscleGroups;
    private final ExerciseRepository exercises;
    private final TrainingOptionRepository trainingOptions;
    private final WorkoutSessionRepository workoutSessions;
    private final LocalUserService localUserService;

    public CatalogService(
        MuscleGroupRepository muscleGroups,
        ExerciseRepository exercises,
        TrainingOptionRepository trainingOptions,
        WorkoutSessionRepository workoutSessions,
        LocalUserService localUserService
    ) {
        this.muscleGroups = muscleGroups;
        this.exercises = exercises;
        this.trainingOptions = trainingOptions;
        this.workoutSessions = workoutSessions;
        this.localUserService = localUserService;
    }

    @Transactional(readOnly = true)
    public List<MuscleGroupResponse> listMuscleGroups() {
        String userId = localUserService.ensureLocalUser().getId();

        return muscleGroups.findByUserIdAndArchivedFalseOrderByPresetDescCreatedAtAsc(userId)
            .stream()
            .map(this::toMuscleGroupResponse)
            .toList();
    }

    @Transactional
    public MuscleGroupResponse createMuscleGroup(CreateMuscleGroupRequest request) {
        String userId = localUserService.ensureLocalUser().getId();
        MuscleGroupEntity group = new MuscleGroupEntity(
            null,
            userId,
            request.name().trim(),
            request.muscleKey() == null ? MuscleKey.CUSTOM : request.muscleKey(),
            blankToNull(request.imageSrc()),
            false
        );

        return toMuscleGroupResponse(muscleGroups.save(group));
    }

    @Transactional
    public MuscleGroupResponse updateMuscleGroup(String id, UpdateMuscleGroupRequest request) {
        MuscleGroupEntity group = getMuscleGroup(id);

        if (hasText(request.name())) {
            group.rename(request.name().trim());
        }
        if (request.muscleKey() != null) {
            group.setMuscleKey(request.muscleKey());
        }
        if (request.imageSrc() != null) {
            group.setImageSrc(blankToNull(request.imageSrc()));
        }

        return toMuscleGroupResponse(group);
    }

    @Transactional
    public void archiveMuscleGroup(String id) {
        getMuscleGroup(id).archive();
    }

    @Transactional(readOnly = true)
    public List<TrainingOptionResponse> listTrainingOptions(String muscleGroupId) {
        String userId = localUserService.ensureLocalUser().getId();

        if (!muscleGroups.existsByIdAndUserId(muscleGroupId, userId)) {
            throw new NotFoundException("Muscle group not found: " + muscleGroupId);
        }

        return trainingOptions.findByUserIdAndMuscleGroupIdAndArchivedFalseOrderByDefaultOptionDescCreatedAtAsc(userId, muscleGroupId)
            .stream()
            .map(this::toTrainingOptionResponse)
            .toList();
    }

    @Transactional
    public TrainingOptionResponse createTrainingOption(CreateTrainingOptionRequest request) {
        String userId = localUserService.ensureLocalUser().getId();

        if (!muscleGroups.existsByIdAndUserId(request.muscleGroupId(), userId)) {
            throw new NotFoundException("Muscle group not found: " + request.muscleGroupId());
        }

        TrainingOptionEntity option = new TrainingOptionEntity(
            null,
            userId,
            request.muscleGroupId(),
            request.name().trim(),
            false
        );
        option.replaceExercises(resolveExercises(userId, request.exercises()));

        return toTrainingOptionResponse(trainingOptions.save(option));
    }

    @Transactional
    public TrainingOptionResponse updateTrainingOption(String id, UpdateTrainingOptionRequest request) {
        TrainingOptionEntity option = getTrainingOption(id);

        if (hasText(request.name())) {
            option.rename(request.name().trim());
        }
        if (request.exercises() != null) {
            option.replaceExercises(resolveExercises(option.getUserId(), request.exercises()));
        }

        return toTrainingOptionResponse(option);
    }

    @Transactional
    public void archiveTrainingOption(String id) {
        getTrainingOption(id).archive();
    }

    private MuscleGroupEntity getMuscleGroup(String id) {
        String userId = localUserService.ensureLocalUser().getId();

        return muscleGroups.findById(id)
            .filter(group -> userId.equals(group.getUserId()))
            .filter(group -> !group.isArchived())
            .orElseThrow(() -> new NotFoundException("Muscle group not found: " + id));
    }

    private TrainingOptionEntity getTrainingOption(String id) {
        String userId = localUserService.ensureLocalUser().getId();

        return trainingOptions.findById(id)
            .filter(option -> userId.equals(option.getUserId()))
            .filter(option -> !option.isArchived())
            .orElseThrow(() -> new NotFoundException("Training option not found: " + id));
    }

    private List<TrainingOptionEntity.ExerciseSelection> resolveExercises(String userId, List<ExerciseInput> inputs) {
        return inputs.stream()
            .filter(input -> hasText(input.name()))
            .map(input -> new TrainingOptionEntity.ExerciseSelection(
                resolveExercise(userId, input.name().trim()),
                input.supersetGroup()
            ))
            .toList();
    }

    private ExerciseEntity resolveExercise(String userId, String name) {
        String normalized = ExerciseEntity.normalize(name);
        return exercises.findByUserIdAndNormalizedNameAndArchivedFalse(userId, normalized)
            .orElseGet(() -> exercises.save(new ExerciseEntity(userId, name)));
    }

    private MuscleGroupResponse toMuscleGroupResponse(MuscleGroupEntity group) {
        return new MuscleGroupResponse(
            group.getId(),
            group.getName(),
            group.getMuscleKey(),
            group.getImageSrc(),
            group.isPreset()
        );
    }

    private TrainingOptionResponse toTrainingOptionResponse(TrainingOptionEntity option) {
        List<ExerciseResponse> exerciseResponses = option.getExercises()
            .stream()
            .map(item -> new ExerciseResponse(
                item.getExercise().getId(),
                item.getExercise().getName(),
                item.getSupersetGroup()
            ))
            .toList();

        return new TrainingOptionResponse(
            option.getId(),
            option.getMuscleGroupId(),
            option.getName(),
            exerciseResponses,
            option.isDefaultOption(),
            workoutSessions.countByUserIdAndTrainingOptionId(option.getUserId(), option.getId())
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }
}
