package com.pelsmasher.api;

import com.pelsmasher.service.AuthenticationFailedException;
import com.pelsmasher.service.NotFoundException;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(AuthenticationFailedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    Map<String, Object> unauthorized(AuthenticationFailedException exception) {
        return Map.of(
            "timestamp", Instant.now(),
            "error", exception.getMessage()
        );
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    Map<String, Object> notFound(NotFoundException exception) {
        return Map.of(
            "timestamp", Instant.now(),
            "error", exception.getMessage()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, Object> validation(MethodArgumentNotValidException exception) {
        return Map.of(
            "timestamp", Instant.now(),
            "error", "Validation failed",
            "fields", exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(
                    java.util.stream.Collectors.toMap(
                        FieldError::getField,
                        error -> error.getDefaultMessage() == null ? "invalid" : error.getDefaultMessage(),
                        (left, right) -> left
                    )
                )
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, Object> badRequest(IllegalArgumentException exception) {
        return Map.of(
            "timestamp", Instant.now(),
            "error", exception.getMessage()
        );
    }
}
