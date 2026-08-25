package com.pelsmasher.repository;

import com.pelsmasher.domain.WorkoutSessionEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSessionEntity, String> {

    @EntityGraph(attributePaths = {"trainingOption", "loggedSets", "loggedSets.exercise"})
    List<WorkoutSessionEntity> findTop20ByUserIdAndTrainingOptionIdOrderByCompletedAtDesc(
        String userId,
        String trainingOptionId
    );

    @EntityGraph(attributePaths = {"trainingOption", "loggedSets", "loggedSets.exercise"})
    Optional<WorkoutSessionEntity> findFirstByUserIdAndTrainingOptionIdOrderByCompletedAtDesc(
        String userId,
        String trainingOptionId
    );

    int countByUserIdAndTrainingOptionId(String userId, String trainingOptionId);

    List<WorkoutSessionEntity> findByUserIdIsNull();
}
