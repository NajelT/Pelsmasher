package com.pelsmasher.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "muscle_groups")
public class MuscleGroupEntity {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MuscleKey muscleKey;

    private String imageSrc;

    @Column(nullable = false)
    private boolean preset;

    @Column(nullable = false)
    private boolean archived;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected MuscleGroupEntity() {
    }

    public MuscleGroupEntity(String id, String name, MuscleKey muscleKey, String imageSrc, boolean preset) {
        this.id = id;
        this.name = name;
        this.muscleKey = muscleKey;
        this.imageSrc = imageSrc;
        this.preset = preset;
        this.archived = false;
    }

    public MuscleGroupEntity(
        String id,
        String userId,
        String name,
        MuscleKey muscleKey,
        String imageSrc,
        boolean preset
    ) {
        this(id, name, muscleKey, imageSrc, preset);
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

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public MuscleKey getMuscleKey() {
        return muscleKey;
    }

    public String getImageSrc() {
        return imageSrc;
    }

    public boolean isPreset() {
        return preset;
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
    }

    public void setMuscleKey(MuscleKey muscleKey) {
        this.muscleKey = muscleKey;
    }

    public void setImageSrc(String imageSrc) {
        this.imageSrc = imageSrc;
    }

    public void archive() {
        this.archived = true;
    }

    public void assignUser(String userId) {
        this.userId = userId;
    }
}
