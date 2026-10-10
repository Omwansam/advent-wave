package org.adventwave.gateway.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Nothing stays public on a lapsed licence. The database refuses to publish under an expired
 * licence, but an item published before its licence's expiry would otherwise keep streaming
 * after it. Each tick marks lapsed licences expired and withdraws their items.
 *
 * <p>Safe with several gateway instances: a second instance finds the licence already expired
 * and its items already withdrawn, and at worst repeats a withdraw event, which consumers apply
 * idempotently.
 */
@Component
public class LicenceExpirySweep {
    private static final Logger log = LoggerFactory.getLogger(LicenceExpirySweep.class);

    private final CatalogAdminService admin;

    public LicenceExpirySweep(CatalogAdminService admin) {
        this.admin = admin;
    }

    @Scheduled(
        initialDelayString = "${adventwave.catalog.licence-expiry-sweep-ms:60000}",
        fixedDelayString = "${adventwave.catalog.licence-expiry-sweep-ms:60000}"
    )
    public void sweep() {
        try {
            int withdrawn = this.admin.expireLapsedLicences();
            if (withdrawn > 0) log.info("licence expiry: withdrew {} item(s) whose licence lapsed", withdrawn);
        } catch (RuntimeException e) {
            log.warn("licence expiry sweep failed; it runs again next tick", e);
        }
    }
}
