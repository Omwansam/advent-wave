package org.adventwave.gateway;

import java.util.List;
import java.util.UUID;
import org.adventwave.catalog.domain.MediaItem;
import org.adventwave.catalog.repo.CatalogRepositories.MediaItemRepository;
import org.adventwave.platform.domain.OutboxEvent;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.domain.UserLike.Key;
import org.adventwave.platform.library.LibraryService;
import org.adventwave.platform.outbox.OutboxWriter;
import org.adventwave.platform.repo.PlatformRepositories.OutboxRepository;
import org.adventwave.platform.repo.PlatformRepositories.UserLikeRepository;
import org.adventwave.platform.user.UserService;
import org.assertj.core.api.AbstractStringAssert;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class OutboxAtomicityTest extends IntegrationTest {
    @Autowired
    LibraryService library;
    @Autowired
    UserService users;
    @Autowired
    OutboxWriter outboxWriter;
    @Autowired
    OutboxRepository outbox;
    @Autowired
    UserLikeRepository likes;
    @Autowired
    MediaItemRepository mediaItems;
    @Autowired
    TransactionTemplate transactions;
    private UUID userId;
    private UUID mediaItemId;

    @BeforeEach
    void setUp() {
        UserAccount useraccount = this.users.provision("test|outbox-" + UUID.randomUUID(), UUID.randomUUID() + "@example.test", "Outbox Tester", null);
        this.userId = useraccount.getId();
        this.mediaItemId = ((MediaItem)this.mediaItems.findByLegacyId("s13").orElseThrow()).getId();
    }

    @Test
    @DisplayName("a like and its event commit together")
    void likeAndEventCommitTogether() {
        long i = this.outbox.count();
        this.library.toggleLike(this.userId, this.mediaItemId, "liked_songs");
        Assertions.assertThat(this.likes.existsById(new Key(this.userId, this.mediaItemId, "liked_songs"))).isTrue();
        Assertions.assertThat(this.outbox.count()).isEqualTo(i + 1L);
        List<OutboxEvent> list = this.outbox.findByAggregateTypeAndAggregateIdOrderByIdAsc("library", this.userId.toString());
        Assertions.assertThat(list).hasSize(1);
        Assertions.assertThat(list.get(0).getEventType()).isEqualTo("library.events.v1");
        ((AbstractStringAssert)Assertions.assertThat(list.get(0).getPayload()).contains(new CharSequence[]{this.mediaItemId.toString()}))
            .contains(new CharSequence[]{"liked"});
        Assertions.assertThat(list.get(0).getPublishedAt()).isNull();
    }

    @Test
    @DisplayName("when the surrounding transaction rolls back, neither the like nor the event survives")
    void rollbackDropsBoth() {
        long i = this.outbox.count();
        Assertions.assertThatThrownBy(() -> this.transactions.executeWithoutResult(status -> {
            this.library.toggleLike(this.userId, this.mediaItemId, "liked_songs");
            throw new IllegalStateException("boom, after the write");
        })).isInstanceOf(IllegalStateException.class);
        Assertions.assertThat(this.likes.existsById(new Key(this.userId, this.mediaItemId, "liked_songs"))).isFalse();
        Assertions.assertThat(this.outbox.count()).isEqualTo(i);
    }

    @Test
    @DisplayName("appending to the outbox outside a transaction is refused, not silently allowed")
    void outboxRequiresATransaction() {
        Assertions.assertThatThrownBy(() -> this.outboxWriter.append("library", this.userId, "library.events.v1", "{}"))
            .isInstanceOf(IllegalTransactionStateException.class);
    }

    @Test
    @DisplayName("unliking also emits an event, so downstream state can be undone")
    void unlikeEmitsToo() {
        this.library.toggleLike(this.userId, this.mediaItemId, "liked_songs");
        this.library.toggleLike(this.userId, this.mediaItemId, "liked_songs");
        List<OutboxEvent> list = this.outbox.findByAggregateTypeAndAggregateIdOrderByIdAsc("library", this.userId.toString());
        Assertions.assertThat(list).hasSize(2);
        Assertions.assertThat(list.get(1).getPayload()).contains(new CharSequence[]{"unliked"});
        Assertions.assertThat(this.likes.existsById(new Key(this.userId, this.mediaItemId, "liked_songs"))).isFalse();
    }
}
