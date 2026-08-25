package com.pelsmasher.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "logged_sets")
public class LoggedSetEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_session_id", nullable = false)
    private WorkoutSessionEntity workoutSession;

    @Column(name = "exercise_id", nullable = false)
    private String exerciseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", insertable = false, updatable = false)
    private ExerciseEntity exercise;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseNameSnapshot;

    @Column(nullable = false)
    private int setNumber;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal weight;

    @Column(nullable = false)
    private int reps;

    @Column(nullable = false)
    private Instant performedAt;

    protected LoggedSetEntity() {
    }

    public LoggedSetEntity(
        String id,
        WorkoutSessionEntity workoutSession,
        String exerciseId,
        String exerciseName,
        int setNumber,
        BigDecimal weight,
        int reps,
        Instant performedAt
    ) {
        this.id = id;
        this.workoutSession = workoutSession;
        this.exerciseId = exerciseId;
        this.exerciseNameSnapshot = exerciseName;
        this.setNumber = setNumber;
        this.weight = weight;
        this.reps = reps;
        this.performedAt = performedAt;
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

    public String getExerciseId() {
        return exerciseId;
    }

    public String getExerciseName() {
        return exerciseNameSnapshot;
    }

    public int getSetNumber() {
        return setNumber;
    }

    public BigDecimal getWeight() {
        return weight;
    }

    public int getReps() {
        return reps;
    }

    public Instant getPerformedAt() {
        return performedAt;
    }
}
