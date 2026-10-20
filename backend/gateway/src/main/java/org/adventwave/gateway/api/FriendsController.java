package org.adventwave.gateway.api;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.FollowResultDto;
import org.adventwave.contracts.api.FriendsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.contracts.api.UserProfileDto;
import org.adventwave.contracts.api.UserSearchDto;
import org.adventwave.contracts.api.UserSummaryDto;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.adventwave.platform.domain.UserAccount;
import org.adventwave.platform.social.FriendService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Listeners following one another, and what the people you follow are playing (RFC 0007). */
@RestController
@RequestMapping({"/v1"})
public class FriendsController {
    /** A play_started with no end after this long past the item's duration is a closed tab, not a song still playing. */
    private static final Duration PLAYING_GRACE = Duration.ofMinutes(1);
    private final FriendService friends;
    private final CatalogService catalog;

    public FriendsController(FriendService friends, CatalogService catalog) {
        this.friends = friends;
        this.catalog = catalog;
    }

    @GetMapping({"/users"})
    public UserSearchDto searchUsers(AuthenticatedUser caller, @RequestParam("q") String query, @RequestParam(value = "limit", defaultValue = "20") int limit) {
        List<UserAccount> found = this.friends.search(caller.id(), query, limit);
        Set<UUID> followed = this.friends.followedAmong(caller.id(), found.stream().map(UserAccount::getId).toList());
        return new UserSearchDto(
            found.stream().map(u -> new UserSummaryDto(u.getId().toString(), u.getDisplayName(), followed.contains(u.getId()))).toList()
        );
    }

    @GetMapping({"/users/{id}"})
    public UserProfileDto userProfile(AuthenticatedUser caller, @PathVariable UUID id) {
        FriendService.Profile profile = this.friends.profile(caller.id(), id).orElseThrow(() -> this.notFound(id));
        return new UserProfileDto(
            id.toString(),
            profile.user().getDisplayName(),
            profile.followers(),
            profile.following(),
            profile.followedByCaller(),
            profile.followsCaller(),
            id.equals(caller.id())
        );
    }

    /** A toggle, like following an artist or a playlist. */
    @PutMapping({"/library/follows/user/{userId}"})
    public FollowResultDto toggleFollowUser(AuthenticatedUser caller, @PathVariable UUID userId) {
        if (!this.friends.exists(userId)) {
            throw this.notFound(userId);
        }
        return new FollowResultDto(this.friends.toggleFollow(caller.id(), userId));
    }

    @GetMapping({"/friends"})
    public FriendsDto friends(AuthenticatedUser caller) {
        List<FriendService.Friend> list = this.friends.friends(caller.id());
        List<UUID> itemIds = list.stream().map(FriendService.Friend::activity).filter(Objects::nonNull).map(FriendService.Activity::mediaItemId).distinct().toList();
        List<TrackDto> tracks = this.catalog.tracks(itemIds);
        Map<String, TrackDto> byId = tracks.stream().collect(Collectors.toMap(TrackDto::id, Function.identity(), (a, b) -> a));
        Instant now = Instant.now();
        return new FriendsDto(
            list.stream().map(f -> new FriendsDto.Friend(f.userId().toString(), f.displayName(), this.activity(f.activity(), byId, now))).toList(),
            tracks
        );
    }

    /** Null when there is nothing to show, including an item withdrawn since it was played. */
    private FriendsDto.Activity activity(FriendService.Activity activity, Map<String, TrackDto> tracks, Instant now) {
        if (activity == null) {
            return null;
        }
        TrackDto track = tracks.get(activity.mediaItemId().toString());
        if (track == null) {
            return null;
        }
        boolean playing = activity.playing() && now.isBefore(activity.at().plusMillis(track.durationMs()).plus(PLAYING_GRACE));
        return new FriendsDto.Activity(track.id(), playing, activity.at().toEpochMilli());
    }

    private ResponseStatusException notFound(UUID id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "user " + id + " not found");
    }
}
