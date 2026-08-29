package com.pelsmasher.service;

import com.pelsmasher.domain.ExerciseEntity;
import com.pelsmasher.domain.MuscleGroupEntity;
import com.pelsmasher.domain.MuscleKey;
import com.pelsmasher.domain.TrainingOptionEntity;
import com.pelsmasher.repository.ExerciseRepository;
import com.pelsmasher.repository.MuscleGroupRepository;
import com.pelsmasher.repository.TrainingOptionRepository;
import com.pelsmasher.repository.WorkoutSessionRepository;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SeedDataService implements ApplicationRunner {

    private final MuscleGroupRepository muscleGroups;
    private final ExerciseRepository exercises;
    private final TrainingOptionRepository trainingOptions;
    private final WorkoutSessionRepository workoutSessions;
    private final LocalUserService localUserService;

    public SeedDataService(
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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String userId = localUserService.ensureLocalUser().getId();
        backfillLocalUser(userId);
        seedDefaultCatalogForUser(userId);
    }

    @Transactional
    public void seedDefaultCatalogForUser(String userId) {
        if (!muscleGroups.findByUserIdAndArchivedFalseOrderByPresetDescCreatedAtAsc(userId).isEmpty()) {
            return;
        }

        seedMuscle(userId, "chest", "Chest", MuscleKey.CHEST, null, List.of(
            new OptionSeed("Heavy Press", List.of("Bench Press", "Incline Press", "Dips")),
            new OptionSeed("Chest Volume", List.of("Dumbbell Press", "Cable Fly", "Push-Up"))
        ));
        seedMuscle(userId, "back", "Back", MuscleKey.BACK, null, List.of(
            new OptionSeed("Heavy Pull", List.of("Deadlift", "Barbell Row", "Pull-Up")),
            new OptionSeed("Back Width", List.of("Lat Pulldown", "Seated Row", "Pullover"))
        ));
        seedMuscle(userId, "shoulders", "Shoulders", MuscleKey.SHOULDERS, null, List.of(
            new OptionSeed("Overhead Power", List.of("Overhead Press", "Arnold Press", "Lateral Raise")),
            new OptionSeed("Delt Volume", List.of("Lateral Raise", "Rear Delt Fly", "Face Pull"))
        ));
        seedMuscle(userId, "biceps", "Biceps", MuscleKey.BICEPS, null, List.of(
            new OptionSeed("Curl Strength", List.of("Barbell Curl", "Hammer Curl", "Preacher Curl")),
            new OptionSeed("Biceps Pump", List.of("Cable Curl", "Incline Curl", "Concentration Curl"))
        ));
        seedMuscle(userId, "triceps", "Triceps", MuscleKey.TRICEPS, null, List.of(
            new OptionSeed("Lockout Strength", List.of("Close-Grip Bench", "Skullcrusher", "Pushdown")),
            new OptionSeed("Triceps Pump", List.of("Rope Pushdown", "Overhead Extension", "Dips"))
        ));
        seedMuscle(userId, "forearms", "Forearms", MuscleKey.FOREARMS, null, List.of(
            new OptionSeed("Grip Work", List.of("Wrist Curl", "Reverse Curl", "Farmer Hold")),
            new OptionSeed("Forearm Pump", List.of("Cable Wrist Curl", "Plate Pinch", "Dead Hang"))
        ));
        seedMuscle(userId, "legs", "Legs", MuscleKey.LEGS, null, List.of(
            new OptionSeed("Heavy Legs", List.of("Squat", "Leg Press", "Romanian Deadlift")),
            new OptionSeed("Leg Volume", List.of("Hack Squat", "Leg Extension", "Leg Curl"))
        ));
        seedMuscle(userId, "calves", "Calves", MuscleKey.CALVES, null, List.of(
            new OptionSeed("Calf Builder", List.of("Standing Calf Raise", "Seated Calf Raise")),
            new OptionSeed("Calf Burn", List.of("Leg Press Calf Raise", "Single-Leg Calf Raise"))
        ));
        seedMuscle(userId, "abs", "Abs", MuscleKey.ABS, null, List.of(
            new OptionSeed("Core Strength", List.of("Cable Crunch", "Hanging Leg Raise", "Plank")),
            new OptionSeed("Abs Volume", List.of("Crunch", "Reverse Crunch", "Ab Wheel"))
        ));
    }

    private void seedMuscle(
        String userId,
        String id,
        String name,
        MuscleKey muscleKey,
        String imageSrc,
        List<OptionSeed> optionSeeds
    ) {
        boolean isLocalUser = LocalUserService.LOCAL_USER_ID.equals(userId);
        MuscleGroupEntity group = muscleGroups.save(
            new MuscleGroupEntity(isLocalUser ? id : null, userId, name, muscleKey, imageSrc, true)
        );

        for (int index = 0; index < optionSeeds.size(); index++) {
            OptionSeed seed = optionSeeds.get(index);
            TrainingOptionEntity option = new TrainingOptionEntity(
                isLocalUser ? id + "-" + slugify(seed.name()) : null,
                userId,
                group.getId(),
                seed.name(),
                true
            );
            option.replaceExercises(
                seed.exerciseNames().stream()
                    .map(exerciseName -> new TrainingOptionEntity.ExerciseSelection(resolveExercise(userId, exerciseName)))
                    .toList()
            );
            trainingOptions.save(option);
        }
    }

    private ExerciseEntity resolveExercise(String userId, String name) {
        return exercises.findByUserIdAndNormalizedNameAndArchivedFalse(userId, ExerciseEntity.normalize(name))
            .orElseGet(() -> exercises.save(new ExerciseEntity(userId, name)));
    }

    private void backfillLocalUser(String userId) {
        muscleGroups.findByUserIdIsNull().forEach(group -> group.assignUser(userId));
        exercises.findByUserIdIsNull().forEach(exercise -> exercise.assignUser(userId));
        trainingOptions.findByUserIdIsNull().forEach(option -> option.assignUser(userId));
        workoutSessions.findByUserIdIsNull().forEach(session -> session.assignUser(userId));
    }

    private static String slugify(String value) {
        return value.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private record OptionSeed(String name, List<String> exerciseNames) {
    }
}
