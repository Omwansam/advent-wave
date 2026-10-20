package org.adventwave.gateway.security.listener;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * The emails listener accounts send (RFC 0005): verification and password reset. Plain text,
 * because a link is all they carry and plain text reaches every inbox.
 *
 * <p>Sent off the request thread, so a reset request for an address with an account takes as
 * long as one without — the response must not say which emails are registered, and nor must its
 * timing. A failed send is logged, never surfaced to the caller for the same reason.
 */
public interface ListenerMailer {
    void send(String to, String subject, String body);

    @Configuration
    class Config {
        private static final Logger log = LoggerFactory.getLogger(ListenerMailer.class);
        private static final ExecutorService OUTBOX = Executors.newVirtualThreadPerTaskExecutor();

        /**
         * {@code adventwave.mail.mode}: {@code smtp} on a server (spring.mail.host and friends),
         * {@code log} on a laptop — the email is written to the log instead, link included, which
         * DevDefaultsGuard refuses anywhere a real listener could be.
         */
        @Bean
        ListenerMailer listenerMailer(
            @Value("${adventwave.mail.mode:log}") String mode,
            @Value("${adventwave.mail.from:AdventWave <no-reply@adventwave.app>}") String from,
            ObjectProvider<JavaMailSender> senders
        ) {
            return switch (mode) {
                case "smtp" -> {
                    JavaMailSender sender = senders.getIfAvailable();
                    if (sender == null) {
                        throw new IllegalStateException("adventwave.mail.mode=smtp needs spring.mail.host (SPRING_MAIL_HOST) and its credentials");
                    }
                    yield (to, subject, body) -> OUTBOX.submit(() -> {
                        try {
                            SimpleMailMessage message = new SimpleMailMessage();
                            message.setFrom(from);
                            message.setTo(to);
                            message.setSubject(subject);
                            message.setText(body);
                            sender.send(message);
                            log.info("sent '{}' to a listener", subject);
                        } catch (Exception e) {
                            log.error("could not send '{}' to a listener", subject, e);
                        }
                    });
                }
                case "log" -> (to, subject, body) -> log.warn(
                    "adventwave.mail.mode=log: this email was NOT sent. To {}: {}\n{}", to, subject, body);
                default -> throw new IllegalStateException("adventwave.mail.mode must be smtp or log, not '" + mode + "'");
            };
        }
    }
}
