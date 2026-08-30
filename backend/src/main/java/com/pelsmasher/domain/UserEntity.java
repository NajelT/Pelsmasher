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
    private String username;

    @Column(nullable = false)
    private String normalizedUsername;

    private String email;

    private String normalizedEmail;

    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected UserEntity() {
    }

    public UserEntity(String id, String username) {
        this.id = id;
        this.username = username;
        this.normalizedUsername = normalizeUsername(username);
    }

    public UserEntity(String id, String username, String email, String passwordHash) {
        this.id = id;
        this.username = username;
        this.normalizedUsername = normalizeUsername(username);
        this.email = email;
        this.normalizedEmail = normalizeEmail(email);
        this.passwordHash = passwordHash;
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    public static String normalizeUsername(String username) {
        return username.trim().toLowerCase();
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

    public String getUsername() {
        return username;
    }

    public String getNormalizedUsername() {
        return normalizedUsername;
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
