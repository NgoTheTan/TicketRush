package com.example.TicketRush_backend.security;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Long)) {
            throw new AppException(ErrorCode.AUTH_TOKEN_MISSING);
        }
        return (Long) auth.getPrincipal();
    }
}
