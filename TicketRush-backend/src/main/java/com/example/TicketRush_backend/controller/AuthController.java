package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.auth.AuthResponse;
import com.example.TicketRush_backend.dto.auth.LoginRequest;
import com.example.TicketRush_backend.dto.auth.RegisterRequest;
import com.example.TicketRush_backend.dto.auth.UpdateProfileRequest;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest req) {
        AuthResponse data = authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse data = authService.login(req);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // Stateless JWT: client discards token. No server-side action needed.
        return ResponseEntity.ok(ApiResponse.noContent());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = authService.getCurrentUser(userId);

        Map<String, Object> profileInfo = new LinkedHashMap<>();
        if (user.getProfile() != null) {
            profileInfo.put("phone", user.getProfile().getPhone());
            profileInfo.put("dateOfBirth", user.getProfile().getDateOfBirth());
            profileInfo.put("gender", user.getProfile().getGender());
            profileInfo.put("avatarUrl", user.getProfile().getAvatarUrl());
        }

        Map<String, Object> userInfo = new LinkedHashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("fullName", user.getFullName());
        userInfo.put("email", user.getEmail());
        userInfo.put("role", user.getRole());
        userInfo.put("profile", profileInfo);

        return ResponseEntity.ok(ApiResponse.ok(userInfo));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateAvatar(
            @RequestParam("file") MultipartFile file) {
        Long userId = SecurityUtils.getCurrentUserId();
        String avatarUrl = authService.updateAvatar(userId, file);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("avatarUrl", avatarUrl)));
    }

    /**
     * PUT /api/v1/auth/me
     * Cập nhật thông tin cá nhân + đổi mật khẩu (tùy chọn).
     * Access: Authenticated (CUSTOMER or ADMIN)
     */
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<Void>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        authService.updateProfile(userId, req);
        return ResponseEntity.ok(ApiResponse.noContent());
    }

    @PostMapping("/seed-admin")
    public ResponseEntity<ApiResponse<Void>> seedAdmin(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().build();
        }
        authService.seedAdmin(email, password);
        return ResponseEntity.ok(ApiResponse.noContent());
    }
}
