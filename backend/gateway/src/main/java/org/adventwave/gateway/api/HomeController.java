package org.adventwave.gateway.api;

import java.time.ZoneId;
import java.util.List;
import org.adventwave.catalog.CatalogService;
import org.adventwave.contracts.api.BrowseDto;
import org.adventwave.contracts.api.DiscoverCategoryDto;
import org.adventwave.contracts.api.DiscoverDto;
import org.adventwave.contracts.api.HomeDto;
import org.adventwave.contracts.api.MediaType;
import org.adventwave.contracts.api.TrackDto;
import org.adventwave.gateway.assemble.HomeAssembler;
import org.adventwave.gateway.security.AuthenticatedUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1"})
public class HomeController {
    private static final int BROWSE_LIMIT = 200;
    private final HomeAssembler home;
    private final CatalogService catalog;

    public HomeController(HomeAssembler home, CatalogService catalog) {
        this.home = home;
        this.catalog = catalog;
    }

    @GetMapping({"/home"})
    public HomeDto home(AuthenticatedUser caller, @RequestParam(required = false) String tz) {
        return this.home.assemble(caller.id(), this.zoneOrUtc(tz));
    }

    @GetMapping({"/discover"})
    public DiscoverDto discover(@RequestParam(required = false) String cat) {
        List<DiscoverCategoryDto> categories = this.catalog.discoverCategories();
        List<TrackDto> tracks = cat != null && !cat.isBlank() && !"all".equals(cat)
            ? this.catalog.discoverCategoryTracks(cat)
            : this.catalog.byType(MediaType.SONG, BROWSE_LIMIT);
        return new DiscoverDto(categories, tracks);
    }

    @GetMapping({"/browse"})
    public BrowseDto browse() {
        return new BrowseDto(
            this.catalog.byType(MediaType.SONG, BROWSE_LIMIT),
            this.catalog.byType(MediaType.SERMON, BROWSE_LIMIT),
            this.catalog.byType(MediaType.PODCAST, BROWSE_LIMIT),
            this.catalog.discoverCategories()
        );
    }

    private ZoneId zoneOrUtc(String tz) {
        if (tz != null && !tz.isBlank()) {
            try {
                return ZoneId.of(tz);
            } catch (Exception exception) {
                return ZoneId.of("UTC");
            }
        } else {
            return ZoneId.of("UTC");
        }
    }
}
