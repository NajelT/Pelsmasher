package com.pelsmasher.api;

import com.pelsmasher.api.ApiDtos.CreateExerciseRequest;
import com.pelsmasher.api.ApiDtos.ExerciseResponse;
import com.pelsmasher.service.CatalogService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final CatalogService catalogService;

    public ExerciseController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    List<ExerciseResponse> list() {
        return catalogService.listExercises();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ExerciseResponse create(@Valid @RequestBody CreateExerciseRequest request) {
        return catalogService.createExercise(request);
    }
}
