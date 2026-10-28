package com.jjlpg.trading.service;
import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.UserRepository;
import com.jjlpg.trading.security.Actor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
@Service
public class StaffService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuditService audit;
    public StaffService(UserRepository users, PasswordEncoder passwords, AuditService audit) {
        this.users = users; this.passwords = passwords; this.audit = audit;
    }
    public StaffDto dto(User u) { return new StaffDto(u.getId(), u.getUsername(), u.getRole(), u.isEnabled()); }
    @Transactional(readOnly = true) public List<StaffDto> list() {
        return users.findAll().stream().sorted(Comparator.comparing(User::getUsername)).map(this::dto).toList();
    }
    @Transactional public StaffDto create(CreateStaffRequest request) {
        if (users.existsByUsernameIgnoreCase(request.username())) throw new IllegalStateException("Username is already in use");
        User u = new User(); u.setUsername(request.username()); u.setPasswordHash(passwords.encode(request.password()));
        u.setRole(request.role()); u.setEnabled(true); users.save(u);
        audit.record("STAFF_CREATED", "STAFF", u.getId(), u.getUsername() + " · role " + u.getRole());
        return dto(u);
    }
    @Transactional public StaffDto update(Long id, UpdateStaffRequest request) {
        // Serialize owner membership changes, then lock the target. This protects the last active owner.
        var owners = users.lockOwners();
        User u = users.lockById(id).orElseThrow(() -> new IllegalArgumentException("Staff account not found"));
        boolean removingOwner = u.getRole() == StaffRole.OWNER && u.isEnabled()
                && (request.role() != StaffRole.OWNER || !request.enabled());
        if (removingOwner && owners.stream().filter(User::isEnabled).count() <= 1)
            throw new IllegalStateException("Keep at least one active owner account");
        if (u.getUsername().equals(Actor.username()) && (!request.enabled() || request.role() != StaffRole.OWNER))
            throw new IllegalStateException("Use another owner account to change your own access");
        String before = u.getRole() + "/" + (u.isEnabled() ? "active" : "disabled");
        u.setRole(request.role()); u.setEnabled(request.enabled());
        if (request.password() != null) u.setPasswordHash(passwords.encode(request.password()));
        u.setTokenVersion(Math.addExact(u.getTokenVersion(), 1));
        audit.record("STAFF_UPDATED", "STAFF", u.getId(), u.getUsername() + " · " + before + " → " + u.getRole() + "/" + (u.isEnabled() ? "active" : "disabled") + (request.password() != null ? " · password reset" : ""));
        return dto(users.save(u));
    }
}
