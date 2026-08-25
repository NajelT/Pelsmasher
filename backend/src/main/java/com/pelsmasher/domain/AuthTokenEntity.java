package com.pelsmasher.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_tokens")
public class AuthTokenEntity {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean revoked;

    protected AuthTokenEntity() {
    }

    public AuthTokenEntity(String tokenHash, String userId, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.expiresAt = expiresAt;
        this.revoked = false;
    }

    @PrePersist
    void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        createdAt = Instant.now();
    }

    public UserEntity getUser() {
        return user;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
