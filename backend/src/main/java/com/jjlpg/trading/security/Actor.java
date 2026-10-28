package com.jjlpg.trading.security;
import org.springframework.security.core.context.SecurityContextHolder;
public final class Actor {
    private Actor() {}
    public static String username() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()) ? auth.getName() : "system";
    }
    public static boolean isOwner() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        // Internal service tests/jobs have no web principal; HTTP requests are gated by SecurityConfig.
        return auth == null || auth.getAuthorities().stream().anyMatch(a -> "ROLE_OWNER".equals(a.getAuthority()));
    }
}
