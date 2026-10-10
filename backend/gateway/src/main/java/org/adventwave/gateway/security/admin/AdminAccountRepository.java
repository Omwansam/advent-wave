package org.adventwave.gateway.security.admin;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAccountRepository extends JpaRepository<AdminAccount, UUID> {
    Optional<AdminAccount> findByEmail(String email);

    List<AdminAccount> findAllByOrderByDisplayNameAsc();

    long countByRoleAndActiveTrue(String role);
}
