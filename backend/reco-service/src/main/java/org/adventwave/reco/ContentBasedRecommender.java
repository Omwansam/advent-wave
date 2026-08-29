package org.adventwave.reco;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import org.adventwave.contracts.api.PlaylistDto;
import org.adventwave.contracts.api.RecommendationsDto;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.contracts.api.RecommendationsDto.BecauseYouListened;
import org.adventwave.contracts.api.RecommendationsDto.TrendingInRegion;
import org.springframework.stereotype.Service;

@Service
public class ContentBasedRecommender {
    private static final int ARTIST_MATCH = 48;
    private static final int GENRE_MATCH = 32;
    private static final int LANGUAGE_MATCH = 26;
    private static final int REGION_MATCH = 22;
    private static final int FOLLOWED_ARTIST = 36;
    private static final double POPULARITY_WEIGHT = 0.12;
    private static final int MAX_SONGS = 18;
    private static final int MAX_PLAYLISTS = 6;
    private static final int MAX_BECAUSE = 12;
    private static final int MAX_TRENDING = 14;
    private static final Map<String, String> REGION_LABEL = Map.of("kenya", "Kenya & East Africa", "global", "Worldwide");

    public RecommendationsDto recommend(TasteProfile taste, List<TrackDto> catalogue, List<PlaylistDto> playlists) {
        if (catalogue != null && !catalogue.isEmpty()) {
            Map<String, TrackDto> map = new LinkedHashMap<>();
            catalogue.forEach(track -> map.put(track.id(), track));
            Set<String> set = new HashSet<>(taste.likedSongIds());
            List<TrackDto> list = new ArrayList<>();
            Set<String> set1 = new HashSet<>();

            for (String s : taste.recentTrackIds()) {
                TrackDto trackdto = map.get(s);
                if (trackdto != null && set1.add(trackdto.id())) {
                    list.add(trackdto);
                }
            }

            for (String s1 : taste.likedSongIds()) {
                TrackDto trackdto2 = map.get(s1);
                if (trackdto2 != null && set1.add(trackdto2.id())) {
                    list.add(trackdto2);
                }
            }

            Set<String> set4 = new LinkedHashSet<>();
            Set<String> set5 = new LinkedHashSet<>();
            Set<String> set6 = new LinkedHashSet<>();
            Set<String> set2 = new LinkedHashSet<>();

            for (TrackDto trackdto1 : list) {
                this.addIfPresent(set4, trackdto1.artist());
                this.addIfPresent(set5, trackdto1.genre());
                this.addIfPresent(set6, trackdto1.language());
                this.addIfPresent(set2, trackdto1.region());
            }

            taste.followedArtistNames().forEach(name -> this.addIfPresent(set4, name));
            Set<String> set7 = new HashSet<>(taste.followedArtistNames());

            for (TrackDto trackdto3 : catalogue) {
                if (set7.contains(trackdto3.artist())) {
                    this.addIfPresent(set5, trackdto3.genre());
                    this.addIfPresent(set6, trackdto3.language());
                    this.addIfPresent(set2, trackdto3.region());
                }
            }

            List<TrackDto> list2 = new ArrayList<>();
            List<TrackDto> list3 = catalogue.stream()
                .map(track -> Map.entry(track, this.score(track, set, set4, set5, set6, set2, set7)))
                .filter(entry -> entry.getValue() > 0.0)
                .sorted(Entry.<TrackDto, Double>comparingByValue().reversed())
                .map(Entry::getKey)
                .toList();
            list2.addAll(list3);
            Set<String> set3 = new HashSet<>(list2.stream().map(TrackDto::id).toList());
            catalogue.stream()
                .filter(track -> !set.contains(track.id()) && !set3.contains(track.id()))
                .sorted(Comparator.comparingInt(TrackDto::popularity).reversed())
                .forEach(track -> {
                    if (list2.size() < 18) {
                        list2.add(track);
                        set3.add(track.id());
                    }
                });
            List<TrackDto> list1 = list2.stream().limit(18L).toList();
            return new RecommendationsDto(
                list1,
                this.recommendPlaylists(playlists, map, set, set4, set5, set6, set2),
                this.becauseYouListened(taste, map, catalogue, set),
                this.trendingInRegion(list, set2, catalogue)
            );
        } else {
            return new RecommendationsDto(List.of(), List.of(), null, new TrendingInRegion(REGION_LABEL.get("global"), "global", List.of()));
        }
    }

    private double score(
        TrackDto track,
        Set<String> liked,
        Set<String> seedArtists,
        Set<String> seedGenres,
        Set<String> seedLanguages,
        Set<String> seedRegions,
        Set<String> followed
    ) {
        if (liked.contains(track.id())) {
            return -1.0;
        } else {
            double d0 = 0.0;
            if (seedArtists.contains(track.artist())) {
                d0 += 48.0;
            }

            if (track.genre() != null && seedGenres.contains(track.genre())) {
                d0 += 32.0;
            }

            if (track.language() != null && seedLanguages.contains(track.language())) {
                d0 += 26.0;
            }

            if (track.region() != null && seedRegions.contains(track.region())) {
                d0 += 22.0;
            }

            if (followed.contains(track.artist())) {
                d0 += 36.0;
            }

            return d0 + track.popularity() * 0.12;
        }
    }

    private List<PlaylistDto> recommendPlaylists(
        List<PlaylistDto> playlists,
        Map<String, TrackDto> byId,
        Set<String> liked,
        Set<String> seedArtists,
        Set<String> seedGenres,
        Set<String> seedLanguages,
        Set<String> seedRegions
    ) {
        if (playlists != null && !playlists.isEmpty()) {
            List<PlaylistDto> list = playlists.stream()
                .map(playlist -> Map.entry(playlist, this.scorePlaylist(playlist, byId, liked, seedArtists, seedGenres, seedLanguages, seedRegions)))
                .filter(entry -> entry.getValue() > 0.0)
                .sorted(Entry.<PlaylistDto, Double>comparingByValue().reversed())
                .map(Entry::getKey)
                .limit(8L)
                .collect(Collectors.toCollection(ArrayList::new));
            if (list.size() < 3) {
                Set<String> set = new HashSet<>(list.stream().map(PlaylistDto::id).toList());
                playlists.stream().filter(playlist -> !set.contains(playlist.id())).limit(4L).forEach(list::add);
            }

            return list.stream().limit(6L).toList();
        } else {
            return List.of();
        }
    }

    private double scorePlaylist(
        PlaylistDto playlist,
        Map<String, TrackDto> byId,
        Set<String> liked,
        Set<String> seedArtists,
        Set<String> seedGenres,
        Set<String> seedLanguages,
        Set<String> seedRegions
    ) {
        List<String> list = playlist.songIds() == null ? List.of() : playlist.songIds();
        double d0 = 0.0;

        for (String s : list) {
            if (liked.contains(s)) {
                d0 += 4.0;
            }

            TrackDto trackdto = byId.get(s);
            if (trackdto != null) {
                if (seedGenres.contains(trackdto.genre())) {
                    d0 += 2.0;
                }

                if (seedLanguages.contains(trackdto.language())) {
                    d0 += 2.0;
                }

                if (seedRegions.contains(trackdto.region())) {
                    d0 += 2.0;
                }

                if (seedArtists.contains(trackdto.artist())) {
                    d0 += 3.0;
                }
            }
        }

        return d0 + Math.min(10.0, list.size() * 0.45);
    }

    private BecauseYouListened becauseYouListened(TasteProfile taste, Map<String, TrackDto> byId, List<TrackDto> catalogue, Set<String> liked) {
        TrackDto trackdto = this.firstResolvable(taste.recentTrackIds(), byId);
        if (trackdto == null) {
            trackdto = this.firstResolvable(taste.likedSongIds(), byId);
        }

        if (trackdto == null) {
            return null;
        } else {
            TrackDto trackdto1 = trackdto;
            List<TrackDto> list = catalogue.stream()
                .filter(track -> track.artist().equals(trackdto1.artist()) && !liked.contains(track.id()) && !track.id().equals(trackdto1.id()))
                .toList();
            if (list.isEmpty() && trackdto1.genre() != null) {
                list = catalogue.stream()
                    .filter(track -> trackdto1.genre().equals(track.genre()) && !liked.contains(track.id()) && !track.id().equals(trackdto1.id()))
                    .toList();
            }

            return list.isEmpty() ? null : new BecauseYouListened(trackdto1.artist(), list.stream().limit(12L).toList());
        }
    }

    private TrendingInRegion trendingInRegion(List<TrackDto> seeds, Set<String> seedRegions, List<TrackDto> catalogue) {
        Map<String, Integer> map = new HashMap<>();

        for (TrackDto trackdto : seeds) {
            String s = trackdto.region() == null ? "global" : trackdto.region();
            map.merge(s, 1, Integer::sum);
        }

        String s1 = "kenya";
        if (!map.isEmpty()) {
            s1 = map.entrySet().stream().max(Entry.comparingByValue()).map(Entry::getKey).orElse(s1);
        } else if (!seedRegions.isEmpty()) {
            s1 = seedRegions.iterator().next();
        }

        String s2 = s1;
        return new TrendingInRegion(
            REGION_LABEL.getOrDefault(s2, REGION_LABEL.get("global")),
            s2,
            catalogue.stream()
                .filter(track -> s2.equals(track.region() == null ? "global" : track.region()))
                .sorted(Comparator.comparingInt(TrackDto::popularity).reversed())
                .limit(14L)
                .toList()
        );
    }

    private TrackDto firstResolvable(List<String> ids, Map<String, TrackDto> byId) {
        for (String s : ids) {
            TrackDto trackdto = byId.get(s);
            if (trackdto != null) {
                return trackdto;
            }
        }

        return null;
    }

    private void addIfPresent(Set<String> target, String value) {
        if (value != null && !value.isBlank()) {
            target.add(value);
        }
    }
}
