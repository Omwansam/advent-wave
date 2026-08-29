package org.adventwave.gateway.api;

import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler({ResponseStatusException.class})
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException e) {
        return this.body(HttpStatus.valueOf(e.getStatusCode().value()), e.getReason());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        String s = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + " " + error.getDefaultMessage())
            .findFirst()
            .orElse("invalid request");
        return this.body(HttpStatus.BAD_REQUEST, s);
    }

    @ExceptionHandler({IllegalArgumentException.class})
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        return this.body(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler({SecurityException.class})
    public ResponseEntity<Map<String, Object>> handleSecurity(SecurityException e) {
        log.warn("ownership violation: {}", e.getMessage());
        return this.body(HttpStatus.NOT_FOUND, "not found");
    }

    @ExceptionHandler({Exception.class})
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception e) {
        log.error("unhandled error", e);
        return this.body(HttpStatus.INTERNAL_SERVER_ERROR, "internal error");
    }

    private ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
        return ResponseEntity.status(status)
            .body(
                Map.of(
                    "status",
                    status.value(),
                    "error",
                    status.getReasonPhrase(),
                    "message",
                    message == null ? status.getReasonPhrase() : message,
                    "timestamp",
                    Instant.now().toString()
                )
            );
    }
}
