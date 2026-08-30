package com.pelsmasher.repository;

import com.pelsmasher.domain.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, String> {

    boolean existsByNormalizedEmail(String normalizedEmail);

    Optional<UserEntity> findByNormalizedEmail(String normalizedEmail);

    boolean existsByNormalizedUsername(String normalizedUsername);
}
