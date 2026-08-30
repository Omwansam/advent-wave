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
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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

    /**
     * A path variable or query parameter that will not convert — a malformed UUID in
     * /v1/media/{id}, or in the uid of a playback URL. That is a bad request, not a server
     * fault: without this it reaches the catch-all below, answers 500, and logs a stack
     * trace for every one, on routes that include an unauthenticated redirect.
     */
    @ExceptionHandler({MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return this.body(HttpStatus.BAD_REQUEST, "invalid value for '" + e.getName() + "'");
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

    /**
     * The client hung up before the response finished writing — a reload mid-request, a
     * closed tab, or the Vite dev-server proxy dropping the connection on restart. The
     * socket is already gone, so there is no status to return and nothing to repair.
     * Without this it reaches the catch-all below, which logs a full stack trace at ERROR
     * and then tries to write a 500 body to the same closed socket. Returning void tells
     * Spring the request is handled and no response is to be written.
     */
    @ExceptionHandler({AsyncRequestNotUsableException.class})
    public void handleClientDisconnect(AsyncRequestNotUsableException e) {
        log.debug("client disconnected before the response was written: {}", e.getMessage());
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
