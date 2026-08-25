package com.pelsmasher.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String displayName;

    private String email;

    private String normalizedEmail;

    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected UserEntity() {
    }

    public UserEntity(String id, String displayName) {
        this.id = id;
        this.displayName = displayName;
    }

    public UserEntity(String id, String email, String passwordHash) {
        this.id = id;
        this.email = email;
        this.normalizedEmail = normalizeEmail(email);
        this.passwordHash = passwordHash;
        this.displayName = email;
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getEmail() {
        return email;
    }

    public String getNormalizedEmail() {
        return normalizedEmail;
    }

    public String getPasswordHash() {
        return passwordHash;
    }
}
