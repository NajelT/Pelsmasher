package com.pelsmasher.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_sessions")
public class WorkoutSessionEntity {

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

    @Column(name = "training_option_id", nullable = false)
    private String trainingOptionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_option_id", insertable = false, updatable = false)
    private TrainingOptionEntity trainingOption;

    @Column(name = "training_option_name", nullable = false)
    private String trainingOptionNameSnapshot;

    @Column(nullable = false)
    private Instant startedAt;

    @Column(nullable = false)
    private Instant completedAt;

    @Column(nullable = false)
    private int durationSeconds;

    @Column(nullable = false)
    private int totalSets;

    @OneToMany(mappedBy = "workoutSession", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<LoggedSetEntity> loggedSets = new ArrayList<>();

    protected WorkoutSessionEntity() {
    }

    public WorkoutSessionEntity(
        String id,
        String muscleGroupId,
        String trainingOptionId,
        String trainingOptionName,
        Instant startedAt,
        Instant completedAt,
        int durationSeconds,
        int totalSets
    ) {
        this.id = id;
        this.muscleGroupId = muscleGroupId;
        this.trainingOptionId = trainingOptionId;
        this.trainingOptionNameSnapshot = trainingOptionName;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.durationSeconds = durationSeconds;
        this.totalSets = totalSets;
    }

    public WorkoutSessionEntity(
        String id,
        String userId,
        String muscleGroupId,
        String trainingOptionId,
        String trainingOptionName,
        Instant startedAt,
        Instant completedAt,
        int durationSeconds,
        int totalSets
    ) {
        this(id, muscleGroupId, trainingOptionId, trainingOptionName, startedAt, completedAt, durationSeconds, totalSets);
        this.userId = userId;
    }

    @PrePersist
    void prePersist() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
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

    public String getTrainingOptionId() {
        return trainingOptionId;
    }

    public String getTrainingOptionName() {
        return trainingOptionNameSnapshot;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public int getTotalSets() {
        return totalSets;
    }

    public List<LoggedSetEntity> getLoggedSets() {
        return loggedSets;
    }

    public void addLoggedSet(LoggedSetEntity loggedSet) {
        loggedSets.add(loggedSet);
    }

    public void assignUser(String userId) {
        this.userId = userId;
    }
}
