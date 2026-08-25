package com.pelsmasher.api;

import com.pelsmasher.api.ApiDtos.CreateMuscleGroupRequest;
import com.pelsmasher.api.ApiDtos.MuscleGroupResponse;
import com.pelsmasher.api.ApiDtos.UpdateMuscleGroupRequest;
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
@RequestMapping("/api/muscle-groups")
public class MuscleGroupController {

    private final CatalogService catalogService;

    public MuscleGroupController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    List<MuscleGroupResponse> list() {
        return catalogService.listMuscleGroups();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    MuscleGroupResponse create(@Valid @RequestBody CreateMuscleGroupRequest request) {
        return catalogService.createMuscleGroup(request);
    }

    @PatchMapping("/{id}")
    MuscleGroupResponse update(@PathVariable String id, @RequestBody UpdateMuscleGroupRequest request) {
        return catalogService.updateMuscleGroup(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void archive(@PathVariable String id) {
        catalogService.archiveMuscleGroup(id);
    }
}
