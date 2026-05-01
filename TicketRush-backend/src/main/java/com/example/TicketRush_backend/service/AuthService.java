package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.auth.AuthResponse;
import com.example.TicketRush_backend.dto.auth.LoginRequest;
import com.example.TicketRush_backend.dto.auth.RegisterRequest;
import com.example.TicketRush_backend.entity.CustomerProfile;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.UserRole;
import com.example.TicketRush_backend.repository.UserRepository;
import com.example.TicketRush_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .role(UserRole.CUSTOMER)
                .build();

        CustomerProfile profile = CustomerProfile.builder()
                .user(user)
                .phone(req.getPhone())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .build();

        user.setProfile(profile);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.from(user))
                .build();
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        String token = jwtUtil.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.from(user))
                .build();
    }

    public User getCurrentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));
    }
}
