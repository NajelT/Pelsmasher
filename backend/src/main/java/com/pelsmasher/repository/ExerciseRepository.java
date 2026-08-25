package com.pelsmasher.repository;

import com.pelsmasher.domain.ExerciseEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<ExerciseEntity, String> {

    Optional<ExerciseEntity> findByUserIdAndNormalizedNameAndArchivedFalse(String userId, String normalizedName);

    List<ExerciseEntity> findByUserIdIsNull();
}
