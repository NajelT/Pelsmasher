package com.pelsmasher.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "training_option_exercises")
public class TrainingOptionExerciseEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "training_option_id", nullable = false)
    private TrainingOptionEntity trainingOption;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private ExerciseEntity exercise;

    private int position;

    protected TrainingOptionExerciseEntity() {
    }

    public TrainingOptionExerciseEntity(TrainingOptionEntity trainingOption, ExerciseEntity exercise, int position) {
        this.trainingOption = trainingOption;
        this.exercise = exercise;
        this.position = position;
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

    public ExerciseEntity getExercise() {
        return exercise;
    }

    public int getPosition() {
        return position;
    }
}
