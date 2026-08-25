package com.pelsmasher.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "training_options")
public class TrainingOptionEntity {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    @Column(name = "muscle_group_id", nullable = false)
    private String muscleGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "muscle_group_id", insertable = false, updatable = false)
    private MuscleGroupEntity muscleGroup;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean defaultOption;

    @Column(nullable = false)
    private boolean archived;

    @OneToMany(mappedBy = "trainingOption", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<TrainingOptionExerciseEntity> exercises = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected TrainingOptionEntity() {
    }

    public TrainingOptionEntity(String id, String muscleGroupId, String name, boolean defaultOption) {
        this.id = id;
        this.muscleGroupId = muscleGroupId;
        this.name = name;
        this.defaultOption = defaultOption;
        this.archived = false;
    }

    public TrainingOptionEntity(
        String id,
        String userId,
        String muscleGroupId,
        String name,
        boolean defaultOption
    ) {
        this(id, muscleGroupId, name, defaultOption);
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

    public String getMuscleGroupId() {
        return muscleGroupId;
    }

    public String getName() {
        return name;
    }

    public boolean isDefaultOption() {
        return defaultOption;
    }

    public boolean isArchived() {
        return archived;
    }

    public List<TrainingOptionExerciseEntity> getExercises() {
        return exercises;
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

    public void replaceExercises(List<ExerciseEntity> newExercises) {
        exercises.clear();
        for (int index = 0; index < newExercises.size(); index++) {
            exercises.add(new TrainingOptionExerciseEntity(this, newExercises.get(index), index));
        }
    }

    public void archive() {
        this.archived = true;
    }

    public void assignUser(String userId) {
        this.userId = userId;
    }
}
