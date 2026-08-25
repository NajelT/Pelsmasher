package com.pelsmasher.repository;

import com.pelsmasher.domain.TrainingOptionEntity;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingOptionRepository extends JpaRepository<TrainingOptionEntity, String> {

    @EntityGraph(attributePaths = {"muscleGroup", "exercises", "exercises.exercise"})
    List<TrainingOptionEntity> findByUserIdAndMuscleGroupIdAndArchivedFalseOrderByDefaultOptionDescCreatedAtAsc(
        String userId,
        String muscleGroupId
    );

    List<TrainingOptionEntity> findByUserIdIsNull();

    boolean existsById(String id);
}
