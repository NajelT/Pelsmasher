package com.pelsmasher.api;

import com.pelsmasher.api.ApiDtos.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    HealthResponse health() {
        return new HealthResponse("ok");
    }
}
