package com.pelsmasher.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exercises")
public class ExerciseEntity {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String normalizedName;

    @Column(nullable = false)
    private boolean archived;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected ExerciseEntity() {
    }

    public ExerciseEntity(String name) {
        this.name = name;
        this.normalizedName = normalize(name);
        this.archived = false;
    }

    public ExerciseEntity(String userId, String name) {
        this(name);
        this.userId = userId;
    }

    @PrePersist
    void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public static String normalize(String value) {
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getNormalizedName() {
        return normalizedName;
    }

    public boolean isArchived() {
        return archived;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void rename(String name) {
        this.name = name;
        this.normalizedName = normalize(name);
    }

    public void assignUser(String userId) {
        this.userId = userId;
    }
}
