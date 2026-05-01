package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.auth.AuthResponse;
import com.example.TicketRush_backend.dto.auth.LoginRequest;
import com.example.TicketRush_backend.dto.auth.RegisterRequest;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

        Map<String, Object> userInfo = Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "profile", user.getProfile() != null ? Map.of(
                        "phone", user.getProfile().getPhone(),
                        "dateOfBirth", user.getProfile().getDateOfBirth(),
                        "gender", user.getProfile().getGender()
                ) : Map.of()
        );

        return ResponseEntity.ok(ApiResponse.ok(userInfo));
    }
}
