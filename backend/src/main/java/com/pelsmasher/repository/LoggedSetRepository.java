package com.pelsmasher.repository;

import com.pelsmasher.domain.LoggedSetEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoggedSetRepository extends JpaRepository<LoggedSetEntity, String> {

    List<LoggedSetEntity> findTop20ByExerciseIdOrderByPerformedAtDesc(String exerciseId);
}
