package com.pelsmasher.repository;

import com.pelsmasher.domain.MuscleGroupEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MuscleGroupRepository extends JpaRepository<MuscleGroupEntity, String> {

    List<MuscleGroupEntity> findByUserIdAndArchivedFalseOrderByPresetDescCreatedAtAsc(String userId);

    List<MuscleGroupEntity> findByUserIdIsNull();

    boolean existsByIdAndUserId(String id, String userId);
}
