package com.pelsmasher.api;

import com.pelsmasher.api.ApiDtos.CreateTrainingOptionRequest;
import com.pelsmasher.api.ApiDtos.TrainingOptionResponse;
import com.pelsmasher.api.ApiDtos.UpdateTrainingOptionRequest;
import com.pelsmasher.service.CatalogService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TrainingOptionController {

    private final CatalogService catalogService;

    public TrainingOptionController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/muscle-groups/{muscleGroupId}/training-options")
    List<TrainingOptionResponse> listForMuscleGroup(@PathVariable String muscleGroupId) {
        return catalogService.listTrainingOptions(muscleGroupId);
    }

    @PostMapping("/training-options")
    @ResponseStatus(HttpStatus.CREATED)
    TrainingOptionResponse create(@Valid @RequestBody CreateTrainingOptionRequest request) {
        return catalogService.createTrainingOption(request);
    }

    @PatchMapping("/training-options/{id}")
    TrainingOptionResponse update(@PathVariable String id, @RequestBody UpdateTrainingOptionRequest request) {
        return catalogService.updateTrainingOption(id, request);
    }

    @DeleteMapping("/training-options/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void archive(@PathVariable String id) {
        catalogService.archiveTrainingOption(id);
    }
}
