package com.pelsmasher.repository;

import com.pelsmasher.domain.AuthTokenEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthTokenRepository extends JpaRepository<AuthTokenEntity, String> {

    Optional<AuthTokenEntity> findByTokenHashAndRevokedFalse(String tokenHash);
}
