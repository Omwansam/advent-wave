package org.adventwave.platform.player;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.adventwave.contracts.redis.RedisKeys;
import org.adventwave.platform.domain.PlayerState;
import org.adventwave.platform.repo.PlatformRepositories;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerStateService {
    private static final Logger log = LoggerFactory.getLogger(PlayerStateService.class);
    private final PlatformRepositories.PlayerStateRepository repository;
    private final PlayerStateService.PlayerStatePersister persister;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public PlayerStateService(
        PlatformRepositories.PlayerStateRepository repository,
        PlayerStateService.PlayerStatePersister persister,
        StringRedisTemplate redis,
        ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.persister = persister;
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public Optional<PlayerStateService.Buffered> get(UUID userId) {
        Optional<PlayerStateService.Buffered> optional = this.readBuffer(userId);
        return optional.isPresent() ? optional : this.repository.findById(userId).map(PlayerStateService.Buffered::from);
    }

    public void save(UUID userId, PlayerStateService.Buffered state) {
        PlayerStateService.Buffered playerstateservice$buffered = new PlayerStateService.Buffered(
            state.mediaItemId(),
            state.positionMs(),
            state.queue() == null ? List.of() : state.queue(),
            state.orderedQueue(),
            state.currentIndex(),
            state.shuffle(),
            state.repeatMode() == null ? "off" : state.repeatMode(),
            state.volume(),
            System.currentTimeMillis()
        );

        try {
            this.redis
                .opsForValue()
                .set(RedisKeys.player(userId.toString()), this.objectMapper.writeValueAsString(playerstateservice$buffered), RedisKeys.PLAYER_TTL);
            this.redis.opsForSet().add(RedisKeys.PLAYER_DIRTY, new String[]{userId.toString()});
        } catch (Exception exception) {
            log.warn("player-state buffer unavailable for {}, writing through to Postgres", userId, exception);
            this.persister.persist(userId, playerstateservice$buffered);
        }
    }

    @Scheduled(
        fixedDelayString = "${adventwave.player.flush-interval-ms:30000}"
    )
    public void flushBuffer() {
        Set<String> set;
        try {
            set = this.redis.opsForSet().members(RedisKeys.PLAYER_DIRTY);
            if (set == null || set.isEmpty()) {
                return;
            }

            this.redis.opsForSet().remove(RedisKeys.PLAYER_DIRTY, set.toArray());
        } catch (Exception exception1) {
            log.warn("could not read player-state dirty set; skipping this flush", exception1);
            return;
        }

        int i = 0;

        for (String s : set) {
            try {
                UUID uuid = UUID.fromString(s);
                this.readBuffer(uuid).ifPresent(state -> this.persister.persist(uuid, state));
                i++;
            } catch (Exception exception) {
                log.warn("failed to flush player state for {}", s, exception);
                this.redis.opsForSet().add(RedisKeys.PLAYER_DIRTY, new String[]{s});
            }
        }

        if (i > 0) {
            log.debug("flushed {} player states to Postgres", i);
        }
    }

    private Optional<PlayerStateService.Buffered> readBuffer(UUID userId) {
        try {
            String s = (String)this.redis.opsForValue().get(RedisKeys.player(userId.toString()));
            return s == null ? Optional.empty() : Optional.of((PlayerStateService.Buffered)this.objectMapper.readValue(s, PlayerStateService.Buffered.class));
        } catch (Exception exception) {
            log.warn("player-state buffer read failed for {}, falling back to Postgres", userId, exception);
            return Optional.empty();
        }
    }

    public record Buffered(
        String mediaItemId,
        int positionMs,
        List<String> queue,
        List<String> orderedQueue,
        int currentIndex,
        boolean shuffle,
        String repeatMode,
        double volume,
        long updatedAtEpochMs
    ) {
        static PlayerStateService.Buffered from(PlayerState state) {
            return new PlayerStateService.Buffered(
                state.getMediaItemId() == null ? null : state.getMediaItemId().toString(),
                state.getPositionMs(),
                state.getQueue(),
                state.getOrderedQueue(),
                state.getCurrentIndex(),
                state.isShuffle(),
                state.getRepeatMode(),
                state.getVolume(),
                state.getUpdatedAt().toEpochMilli()
            );
        }
    }

    @Service
    public static class PlayerStatePersister {
        private final PlatformRepositories.PlayerStateRepository repository;

        public PlayerStatePersister(PlatformRepositories.PlayerStateRepository repository) {
            this.repository = repository;
        }

        @Transactional
        public void persist(UUID userId, PlayerStateService.Buffered state) {
            PlayerState playerstate = this.repository.findById(userId).orElseGet(() -> new PlayerState(userId));
            playerstate.setMediaItemId(state.mediaItemId() == null ? null : UUID.fromString(state.mediaItemId()));
            playerstate.setPositionMs(Math.max(0, state.positionMs()));
            playerstate.setQueue(state.queue() == null ? new ArrayList<>() : new ArrayList<>(state.queue()));
            playerstate.setOrderedQueue(state.orderedQueue() == null ? null : new ArrayList<>(state.orderedQueue()));
            playerstate.setCurrentIndex(Math.max(0, state.currentIndex()));
            playerstate.setShuffle(state.shuffle());
            playerstate.setRepeatMode(state.repeatMode());
            playerstate.setVolume(Math.clamp(state.volume(), 0.0, 1.0));
            playerstate.setUpdatedAt(Instant.ofEpochMilli(state.updatedAtEpochMs()));
            this.repository.save(playerstate);
        }
    }
}
