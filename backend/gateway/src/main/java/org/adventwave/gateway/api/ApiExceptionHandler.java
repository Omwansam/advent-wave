package org.adventwave.gateway.api;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.adventwave.gateway.admin.AdminConflictException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
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

    /** A required query parameter is absent — `q` on /v1/search, `ids` on /v1/media, `sig` on the redirect. */
    @ExceptionHandler({MissingServletRequestParameterException.class})
    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException e) {
        return this.body(HttpStatus.BAD_REQUEST, "missing required parameter '" + e.getParameterName() + "'");
    }

    /** Empty, truncated or non-JSON request body. */
    @ExceptionHandler({HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException e) {
        return this.body(HttpStatus.BAD_REQUEST, "request body is missing or not valid JSON");
    }

    /**
     * A foreign key refused the write: following an artist or playlist that does not exist,
     * adding an unknown media item to a playlist. The referenced thing is what was not found,
     * so this is a 404 on the reference rather than a 400 on the request shape.
     */
    @ExceptionHandler({DataIntegrityViolationException.class})
    public ResponseEntity<Map<String, Object>> handleIntegrity(DataIntegrityViolationException e) {
        log.debug("integrity violation: {}", e.getMostSpecificCause().getMessage());
        return this.body(HttpStatus.NOT_FOUND, "a referenced item does not exist");
    }

    /** The target exists and the request is well-formed; its current state refuses the operation. */
    @ExceptionHandler({AdminConflictException.class})
    public ResponseEntity<Map<String, Object>> handleConflict(AdminConflictException e) {
        return this.body(HttpStatus.CONFLICT, e.getMessage());
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
     *
     * <p>Static resources write straight to the socket, so there the hang-up arrives as
     * Tomcat's own ClientAbortException, unwrapped. That is routine for the local media
     * origin: an audio element abandons range requests whenever the listener seeks or skips.
     */
    @ExceptionHandler({AsyncRequestNotUsableException.class, ClientAbortException.class})
    public void handleClientDisconnect(IOException e) {
        log.debug("client disconnected before the response was written: {}", e.getMessage());
    }

    @ExceptionHandler({Exception.class})
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception e) {
        // Spring's own request errors carry their status: no route (404), wrong method (405),
        // unsupported content type (415). Answering those 500 with a stack trace at ERROR made
        // every mistyped URL look like a server fault.
        if (e instanceof ErrorResponse framework && framework.getStatusCode().is4xxClientError()) {
            log.debug("request error {}: {}", framework.getStatusCode().value(), e.getMessage());
            return this.body(HttpStatus.valueOf(framework.getStatusCode().value()), framework.getBody().getDetail());
        }
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
