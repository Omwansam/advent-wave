package org.adventwave.gateway.upload;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * True when {@code adventwave.catalog.local-media-root} is set and not blank — the same test as
 * {@code LocalMediaOriginConfig.enabled}. The local stand-ins for storage (the media origin, the
 * upload endpoint) exist only then. {@code @ConditionalOnProperty} would also match a blank value.
 */
public class LocalMediaRootCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String root = context.getEnvironment().getProperty("adventwave.catalog.local-media-root");
        // With object storage chosen (RFC 0006) the local stand-ins stay off even if a root is set.
        boolean s3 = "s3".equals(context.getEnvironment().getProperty("adventwave.storage.mode", "local"));
        return !s3 && root != null && !root.isBlank();
    }
}
