package com.example.TicketRush_backend.dto.auth;

import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.UserRole;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class AuthResponse {
    private String token;
    private UserInfo user;

    @Data @Builder
    public static class UserInfo {
        private Long id;
        private String fullName;
        private String email;
        private UserRole role;
        private String avatarUrl;

        public static UserInfo from(User u) {
            return UserInfo.builder()
                    .id(u.getId())
                    .fullName(u.getFullName())
                    .email(u.getEmail())
                    .role(u.getRole())
                    .avatarUrl(u.getProfile() != null ? u.getProfile().getAvatarUrl() : null)
                    .build();
        }
    }
}
