package org.adventwave.gateway.api.admin;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.adventwave.contracts.api.admin.ChurchDto;
import org.adventwave.contracts.api.admin.LicenseDto;
import org.adventwave.gateway.admin.CatalogAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Contributors and their consent. Reading needs {@code catalog:read}; changes need {@code rights:write} (AdminAccessRules). */
@RestController
@RequestMapping("/v1/admin")
public class ChurchAdminController {
    private final CatalogAdminService admin;

    public ChurchAdminController(CatalogAdminService admin) {
        this.admin = admin;
    }

    @GetMapping("/churches")
    public List<ChurchDto> listChurches() {
        return this.admin.listChurches();
    }

    @PostMapping("/churches")
    @ResponseStatus(HttpStatus.CREATED)
    public ChurchDto createChurch(@Valid @RequestBody ChurchDto.Request request) {
        return this.admin.createChurch(request);
    }

    @GetMapping("/churches/{id}")
    public ChurchDto church(@PathVariable UUID id) {
        return this.admin.church(id);
    }

    @PutMapping("/churches/{id}")
    public ChurchDto updateChurch(@PathVariable UUID id, @Valid @RequestBody ChurchDto.Request request) {
        return this.admin.updateChurch(id, request);
    }

    @PutMapping("/churches/{id}/consent")
    public ChurchDto setChurchConsent(@PathVariable UUID id, @Valid @RequestBody ChurchDto.ConsentRequest request) {
        return this.admin.setChurchConsent(id, request);
    }

    @GetMapping("/churches/{id}/licenses")
    public List<LicenseDto> licensesForChurch(@PathVariable UUID id) {
        return this.admin.licensesForChurch(id);
    }

    /** Every licence across churches, newest first; {@code status} is pending | granted | revoked | expired. */
    @GetMapping("/licenses")
    public List<LicenseDto> listLicenses(@RequestParam(required = false) String status) {
        return this.admin.listLicenses(status);
    }

    @PostMapping("/licenses")
    @ResponseStatus(HttpStatus.CREATED)
    public LicenseDto createLicense(@Valid @RequestBody LicenseDto.Request request) {
        return this.admin.createLicense(request);
    }

    @GetMapping("/licenses/{id}")
    public LicenseDto license(@PathVariable UUID id) {
        return this.admin.license(id);
    }

    @PutMapping("/licenses/{id}/status")
    public LicenseDto setLicenseStatus(@PathVariable UUID id, @Valid @RequestBody LicenseDto.StatusRequest request) {
        return this.admin.setLicenseStatus(id, request);
    }
}
