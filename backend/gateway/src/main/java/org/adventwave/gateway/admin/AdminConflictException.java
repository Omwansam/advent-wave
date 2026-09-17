package org.adventwave.gateway.admin;

/** The request is well-formed and the target exists, but its current state refuses the operation — 409. */
public class AdminConflictException extends RuntimeException {
    public AdminConflictException(String message) {
        super(message);
    }
}
