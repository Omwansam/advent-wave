package org.adventwave.gateway.audio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.adventwave.contracts.events.Topics;
import org.adventwave.platform.outbox.OutboxWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Workstream D's worker as it runs on one machine (RFC 0001): takes {@code requested} jobs from
 * {@link TranscodeRequestedHandler}, runs {@code tools/transcode.py run} for each, and appends the
 * {@code completed} message the tool prints to the outbox, where {@code TranscodeCompletedHandler}
 * picks it up — the same seam a Kafka worker would use.
 *
 * <p>Why not in the handler: the dispatcher calls handlers synchronously, inside its batch, and
 * never retries one that throws, while a transcode takes minutes. So the handler only enqueues,
 * and this runs the jobs on its own thread, one at a time — ffmpeg already uses every core.
 *
 * <p>Retries follow contracts/audio/transcode.md (3 attempts): a crash, a timeout or output that
 * is not a message for this item is retried after each {@code adventwave.audio.retry-backoff}
 * wait; after the last, a {@code failed} message says what happened. A {@code failed} message
 * the tool prints itself (probe, encode, verify) is a verdict about the master, not a hiccup:
 * final, delivered as is. Transcoding is deterministic, so any re-run is safe.
 *
 * <p>Started only with {@code adventwave.audio.local-worker-enabled=true} (application-local.yml),
 * and refuses to start without the script, python, ffmpeg, ffprobe or a local media root.
 */
@Component
@ConditionalOnProperty(name = "adventwave.audio.local-worker-enabled", havingValue = "true")
public class LocalTranscodeWorker {
    private static final Logger log = LoggerFactory.getLogger(LocalTranscodeWorker.class);

    /** Processing items whose latest {@code requested} has no later {@code completed}: work cut short by a restart. */
    private static final String INTERRUPTED = """
        SELECT m.id, m.media_type, m.master_storage_key
        FROM media_items m
        WHERE m.status = 'processing'
          AND m.master_storage_key IS NOT NULL
          AND (SELECT max(o.id) FROM outbox o
               WHERE o.event_type = ? AND o.aggregate_id = m.id::text AND o.payload->>'kind' = 'requested')
            > COALESCE((SELECT max(o.id) FROM outbox o
                        WHERE o.event_type = ? AND o.aggregate_id = m.id::text AND o.payload->>'kind' = 'completed'), 0)
        ORDER BY m.updated_at
        """;

    private final AudioProperties audio;
    private final OutboxWriter outbox;
    private final TransactionTemplate transaction;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final Path script;
    private final TranscodeStorage storage;
    private final ScheduledExecutorService executor;
    /** Queued, running or waiting to retry. A job is accepted once until it reaches a verdict. */
    private final Set<UUID> pending = ConcurrentHashMap.newKeySet();
    private volatile Process running;

    public LocalTranscodeWorker(
        AudioProperties audio,
        OutboxWriter outbox,
        TransactionTemplate transaction,
        JdbcTemplate jdbc,
        ObjectMapper objectMapper,
        ObjectProvider<TranscodeStorage> storage
    ) {
        this.audio = audio;
        this.outbox = outbox;
        this.transaction = transaction;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.script = Path.of(audio.getTranscodeScript()).toAbsolutePath().normalize();
        this.storage = storage.getIfAvailable();
        if (this.storage == null) {
            throw new IllegalStateException("adventwave.audio.local-worker-enabled needs somewhere to read masters and write derived "
                + "files: adventwave.catalog.local-media-root, or adventwave.storage.mode=s3 (RFC 0006)");
        }
        this.checkPrerequisites();
        this.executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "transcode-worker");
            t.setDaemon(true);
            return t;
        });
        log.info("transcode worker: {} {}, storage {}, timeout {}, retries after {}",
            audio.getPython(), this.script, this.storage instanceof TranscodeStorage.S3 ? "s3 staging" : "local media root",
            audio.getTranscodeTimeout(), audio.getRetryBackoff());
    }

    /** Fail at startup, not on the first upload: a worker that cannot run would leave every item in processing. */
    private void checkPrerequisites() {
        if (!Files.isRegularFile(this.script)) {
            throw new IllegalStateException("adventwave.audio.transcode-script: no file at " + this.script
                + " (resolved from the working directory " + Path.of("").toAbsolutePath() + ")");
        }
        for (List<String> probe : List.of(
            List.of(this.audio.getPython(), "--version"),
            List.of("ffmpeg", "-hide_banner", "-version"),
            List.of("ffprobe", "-hide_banner", "-version"))) {
            try {
                Process p = new ProcessBuilder(probe).redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
                if (!p.waitFor(20, TimeUnit.SECONDS) || p.exitValue() != 0) {
                    throw new IllegalStateException(probe.get(0) + " is not usable (exit " + (p.isAlive() ? "timeout" : p.exitValue()) + ")");
                }
            } catch (IOException e) {
                throw new IllegalStateException("the local transcode worker needs " + probe.get(0) + " on PATH: " + e.getMessage(), e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("interrupted while checking " + probe.get(0), e);
            }
        }
    }

    /** Re-enqueues work a restart cut short. Deterministic outputs make the re-run safe. */
    @EventListener(ApplicationReadyEvent.class)
    public void resumeInterrupted() {
        List<TranscodeJob> jobs = this.jdbc.query(INTERRUPTED, (rs, n) -> new TranscodeJob(
            rs.getObject("id", UUID.class), rs.getString("media_type"), rs.getString("master_storage_key"), 1),
            Topics.AUDIO_TRANSCODE, Topics.AUDIO_TRANSCODE);
        if (!jobs.isEmpty()) log.info("local transcode worker: resuming {} interrupted job(s)", jobs.size());
        jobs.forEach(this::enqueue);
    }

    /** Accepts a job unless the same item is already queued, running or waiting to retry. */
    public void enqueue(TranscodeJob job) {
        if (!this.pending.add(job.mediaItemId())) {
            log.info("transcode {}: already queued", job.mediaItemId());
            return;
        }
        log.info("transcode {}: queued ({} from {}, attempt {})", job.mediaItemId(), job.mediaType(), job.masterStorageKey(), job.attempt());
        this.executor.execute(() -> this.run(job));
    }

    private void run(TranscodeJob job) {
        UUID id = job.mediaItemId();
        String status = this.jdbc.query("SELECT status FROM media_items WHERE id = ?",
            rs -> rs.next() ? rs.getString(1) : null, id);
        if (!"processing".equals(status)) {
            log.info("transcode {}: skipped, the item is {} now", id, status);
            this.pending.remove(id);
            return;
        }

        String problem;
        Path root = null;
        try {
            root = this.storage.prepare(job);
            Outcome outcome = this.invoke(job, root);
            if (outcome.message() != null) {
                // The outputs reach the derived store before the message that publishes them.
                if ("completed".equals(outcome.message().path("status").asText())) {
                    this.storage.publish(id, root, outcome.message());
                }
                this.deliver(outcome.message());
                this.pending.remove(id);
                return;
            }
            problem = outcome.problem();
            if (outcome.signalled() && this.stoppingSoon()) {
                log.info("transcode {}: the tool was stopped with the gateway; the next start resumes it", id);
                return;
            }
        } catch (Exception e) {
            problem = "the transcode tool could not be run or its result recorded: " + e.getMessage();
            if (!this.executor.isShutdown()) log.warn("transcode {}: attempt {} errored", id, job.attempt(), e);
        } finally {
            if (root != null) this.storage.cleanup(id, root);
        }
        if (this.executor.isShutdown()) {
            // stop() killed the run; the next start finds the item in the outbox and resumes it
            return;
        }

        List<Duration> backoff = this.audio.getRetryBackoff();
        if (job.attempt() <= backoff.size()) {
            Duration wait = backoff.get(job.attempt() - 1);
            log.warn("transcode {}: attempt {} gave no result ({}); attempt {} in {}", id, job.attempt(), problem, job.attempt() + 1, wait);
            this.executor.schedule(() -> this.run(job.nextAttempt()), wait.toMillis(), TimeUnit.MILLISECONDS);
            return;
        }
        log.error("transcode {}: giving up after {} attempts: {}", id, job.attempt(), problem);
        try {
            this.deliver(this.failedMessage(id, "the transcode did not finish after " + job.attempt() + " attempts: " + problem));
        } catch (Exception e) {
            log.error("transcode {}: could not record the failure; the item stays processing until the gateway restarts", id, e);
        }
        this.pending.remove(id);
    }

    /**
     * Stopping the gateway from a terminal or Maven signals the whole process group, so the tool
     * can die a moment before {@link #stop()} runs. Give shutdown a moment to show itself before
     * calling a SIGTERM'd run a crash and scheduling a retry that would never happen.
     */
    private boolean stoppingSoon() {
        try {
            Thread.sleep(2000);
            return this.executor.isShutdown();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return true;
        }
    }

    /** Runs the tool once. A message for this item, or why there is none. */
    private Outcome invoke(TranscodeJob job, Path mediaRoot) throws IOException, InterruptedException {
        UUID id = job.mediaItemId();
        List<String> command = List.of(
            this.audio.getPython(), this.script.toString(), "run",
            "--media-item-id", id.toString(),
            "--media-type", job.mediaType(),
            "--master-key", job.masterStorageKey(),
            "--media-root", mediaRoot.toString());
        log.info("transcode {}: attempt {} started", id, job.attempt());
        Process process = new ProcessBuilder(command).start();
        this.running = process;
        try {
            process.getOutputStream().close();
            // Both pipes drained at once: a tool that fills one while we block on the other never exits.
            Deque<String> lastLines = new ArrayDeque<>();
            CompletableFuture<Void> stderr = background(() -> {
                this.logLines(id, process.getErrorStream(), lastLines);
                return null;
            });
            CompletableFuture<String> stdout = background(() -> readAll(process.getInputStream()));

            if (!process.waitFor(this.audio.getTranscodeTimeout().toMillis(), TimeUnit.MILLISECONDS)) {
                destroyTree(process);
                return Outcome.problem("it was still running after " + this.audio.getTranscodeTimeout() + " and was stopped");
            }
            String out = stdout.get(30, TimeUnit.SECONDS);
            stderr.get(30, TimeUnit.SECONDS);
            JsonNode message = this.messageFor(id, out);
            if (message != null) {
                log.info("transcode {}: attempt {} ended {} (exit {})", id, job.attempt(), message.path("status").asText(), process.exitValue());
                return Outcome.of(message);
            }
            String last;
            synchronized (lastLines) {
                last = lastLines.isEmpty() ? "" : ": " + lastLines.peekLast();
            }
            return Outcome.problem("the tool exited " + process.exitValue() + " without a result" + last, process.exitValue());
        } catch (java.util.concurrent.ExecutionException | java.util.concurrent.TimeoutException e) {
            destroyTree(process);
            return Outcome.problem("its output could not be read: " + e.getMessage());
        } finally {
            this.running = null;
        }
    }

    /** stdout parsed as an {@code audio.transcode.v1} completed message about this item, or null. */
    private JsonNode messageFor(UUID id, String stdout) {
        try {
            JsonNode m = this.objectMapper.readTree(stdout);
            boolean ours = m != null
                && "completed".equals(m.path("kind").asText())
                && id.toString().equals(m.path("media_item_id").asText())
                && List.of("completed", "failed").contains(m.path("status").asText());
            if (!ours) return null;
            UUID.fromString(m.path("event_id").asText());
            return m;
        } catch (Exception e) {
            return null;
        }
    }

    /** Appends the message to the outbox, keyed by its own event_id (K1); the dispatcher delivers it. */
    private void deliver(JsonNode message) {
        UUID id = UUID.fromString(message.path("media_item_id").asText());
        UUID eventId = UUID.fromString(message.path("event_id").asText());
        this.transaction.executeWithoutResult(s -> this.outbox.append("media_item", id, Topics.AUDIO_TRANSCODE, message, eventId));
        log.info("transcode {}: {} message appended to the outbox (event {})", id, message.path("status").asText(), eventId);
    }

    private JsonNode failedMessage(UUID id, String reason) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", "encode_failed");
        error.put("message", reason);
        error.put("stage", "encode");
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("kind", "completed");
        m.put("event_id", UUID.randomUUID().toString());
        m.put("media_item_id", id.toString());
        m.put("status", "failed");
        m.put("assets", List.of());
        m.put("flags", List.of());
        m.put("error", error);
        m.put("completed_at", Instant.now().toString());
        return this.objectMapper.valueToTree(m);
    }

    private void logLines(UUID id, InputStream stream, Deque<String> lastLines) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.info("transcode {}: {}", id, line);
                synchronized (lastLines) {
                    lastLines.addLast(line);
                    if (lastLines.size() > 5) lastLines.removeFirst();
                }
            }
        } catch (IOException e) {
            log.debug("transcode {}: stderr closed: {}", id, e.getMessage());
        }
    }

    private static <T> CompletableFuture<T> background(java.util.function.Supplier<T> work) {
        CompletableFuture<T> result = new CompletableFuture<>();
        Thread.ofVirtual().start(() -> {
            try {
                result.complete(work.get());
            } catch (Throwable t) {
                result.completeExceptionally(t);
            }
        });
        return result;
    }

    private static String readAll(InputStream stream) {
        try {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    /** The tool's ffmpeg is its child; stopping only python would leave ffmpeg writing. */
    private static void destroyTree(Process process) {
        process.toHandle().descendants().forEach(ProcessHandle::destroyForcibly);
        process.destroyForcibly();
    }

    /** On shutdown the running job is killed, not finished; the next start resumes it from the outbox. */
    @PreDestroy
    void stop() {
        this.executor.shutdownNow();
        Process p = this.running;
        if (p != null) {
            log.info("local transcode worker: stopping the running transcode; it resumes on the next start");
            destroyTree(p);
        }
    }

    private record Outcome(JsonNode message, String problem, Integer exitCode) {
        static Outcome of(JsonNode message) {
            return new Outcome(message, null, null);
        }

        static Outcome problem(String problem) {
            return new Outcome(null, problem, null);
        }

        static Outcome problem(String problem, int exitCode) {
            return new Outcome(null, problem, exitCode);
        }

        /** Ended by SIGINT or SIGTERM (128 + signal), not by its own failure. */
        boolean signalled() {
            return this.exitCode != null && (this.exitCode == 130 || this.exitCode == 143);
        }
    }
}
