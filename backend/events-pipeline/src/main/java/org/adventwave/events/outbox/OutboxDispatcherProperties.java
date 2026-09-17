package org.adventwave.events.outbox;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "adventwave.events.dispatcher")
public class OutboxDispatcherProperties {
    /** Off once Debezium publishes the outbox; the handlers then listen to Kafka instead. */
    private boolean enabled = true;
    /** How long a row waits, at most, before the handlers see it. */
    private long intervalMs = 2000;
    /** Rows per transaction. A backlog is drained in consecutive batches without waiting. */
    private int batchSize = 500;

    public boolean isEnabled() { return this.enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public long getIntervalMs() { return this.intervalMs; }
    public void setIntervalMs(long intervalMs) { this.intervalMs = intervalMs; }
    public int getBatchSize() { return this.batchSize; }
    public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
}
