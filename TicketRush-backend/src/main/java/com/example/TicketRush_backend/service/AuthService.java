package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.auth.AuthResponse;
import com.example.TicketRush_backend.dto.auth.ForgotPasswordRequest;
import com.example.TicketRush_backend.dto.auth.GoogleLoginRequest;
import com.example.TicketRush_backend.dto.auth.LoginRequest;
import com.example.TicketRush_backend.dto.auth.RegisterRequest;
import com.example.TicketRush_backend.dto.auth.ResetPasswordRequest;
import com.example.TicketRush_backend.dto.auth.UpdateProfileRequest;
import com.example.TicketRush_backend.dto.auth.VerifyResetOtpRequest;
import com.example.TicketRush_backend.entity.PasswordResetOtp;
import com.example.TicketRush_backend.repository.CustomerProfileRepository;
import com.example.TicketRush_backend.entity.CustomerProfile;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.UserRole;
import com.example.TicketRush_backend.repository.PasswordResetOtpRepository;
import com.example.TicketRush_backend.repository.UserRepository;
import com.example.TicketRush_backend.security.GoogleTokenVerifier;
import com.example.TicketRush_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Value("${app.auth.password-reset-otp-ttl-minutes:10}")
    private int passwordResetOtpTtlMinutes;

    private static final long MAX_AVATAR_BYTES = 2 * 1024 * 1024;
    private static final int OTP_DIGITS = 6;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

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
                .phone(blankToNull(req.getPhone()))
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

    @Transactional(readOnly = true)
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

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest req) {
        GoogleTokenVerifier.GoogleUserInfo googleUser = googleTokenVerifier.verify(req.getCredential());
        User user = userRepository.findByEmail(googleUser.email())
                .orElseGet(() -> createGoogleCustomer(googleUser));

        if (user.getRole() != UserRole.CUSTOMER) {
            throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS,
                    Map.of("message", "Đăng nhập Google chỉ hỗ trợ tài khoản khách hàng"));
        }

        syncGoogleProfile(user, googleUser);

        String token = jwtUtil.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.from(user))
                .build();
    }

    private User createGoogleCustomer(GoogleTokenVerifier.GoogleUserInfo googleUser) {
        User user = User.builder()
                .email(googleUser.email())
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .fullName(googleUser.fullName())
                .role(UserRole.CUSTOMER)
                .build();

        CustomerProfile profile = CustomerProfile.builder()
                .user(user)
                .avatarUrl(blankToNull(googleUser.pictureUrl()))
                .build();

        user.setProfile(profile);
        return userRepository.save(user);
    }

    private void syncGoogleProfile(User user, GoogleTokenVerifier.GoogleUserInfo googleUser) {
        if ((user.getFullName() == null || user.getFullName().isBlank()) && !googleUser.fullName().isBlank()) {
            user.setFullName(googleUser.fullName());
        }

        if (user.getProfile() == null) {
            CustomerProfile profile = CustomerProfile.builder()
                    .user(user)
                    .avatarUrl(blankToNull(googleUser.pictureUrl()))
                    .build();
            user.setProfile(profile);
        } else if ((user.getProfile().getAvatarUrl() == null || user.getProfile().getAvatarUrl().isBlank())
                && !googleUser.pictureUrl().isBlank()) {
            user.getProfile().setAvatarUrl(googleUser.pictureUrl());
        }

        userRepository.save(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        String email = normalizeEmail(req.getEmail());
        userRepository.findByEmail(email).ifPresent(user -> {
            Instant now = Instant.now();
            String otp = generateOtp();

            passwordResetOtpRepository.markActiveOtpsUsed(user.getId(), now);
            PasswordResetOtp resetOtp = PasswordResetOtp.builder()
                    .user(user)
                    .codeHash(passwordEncoder.encode(otp))
                    .expiresAt(now.plusSeconds(passwordResetOtpTtlMinutes * 60L))
                    .build();
            passwordResetOtpRepository.save(resetOtp);

            emailService.sendPasswordResetOtp(email, otp, passwordResetOtpTtlMinutes);
        });
    }

    @Transactional
    public void verifyResetOtp(VerifyResetOtpRequest req) {
        validateActiveResetOtp(normalizeEmail(req.getEmail()), req.getOtp().trim());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        String email = normalizeEmail(req.getEmail());
        validatePasswordStrength(req.getNewPassword());

        ResetOtpContext context = validateActiveResetOtp(email, req.getOtp().trim());
        User user = context.user();
        Instant now = Instant.now();

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        context.resetOtp().setUsedAt(now);
        passwordResetOtpRepository.markActiveOtpsUsed(user.getId(), now);
        userRepository.save(user);
    }

    private ResetOtpContext validateActiveResetOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_RESET_OTP_INVALID));
        PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findFirstByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_RESET_OTP_INVALID));

        Instant now = Instant.now();
        if (resetOtp.getExpiresAt().isBefore(now)) {
            resetOtp.setUsedAt(now);
            passwordResetOtpRepository.save(resetOtp);
            throw new AppException(ErrorCode.AUTH_RESET_OTP_EXPIRED);
        }

        if (resetOtp.getAttempts() >= MAX_OTP_ATTEMPTS) {
            resetOtp.setUsedAt(now);
            passwordResetOtpRepository.save(resetOtp);
            throw new AppException(ErrorCode.AUTH_RESET_OTP_INVALID);
        }

        if (!passwordEncoder.matches(otp, resetOtp.getCodeHash())) {
            resetOtp.setAttempts(resetOtp.getAttempts() + 1);
            passwordResetOtpRepository.save(resetOtp);
            throw new AppException(ErrorCode.AUTH_RESET_OTP_INVALID);
        }

        return new ResetOtpContext(user, resetOtp);
    }

    private record ResetOtpContext(User user, PasswordResetOtp resetOtp) {
    }

    public User getCurrentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));
    }

    @Transactional
    public String updateAvatar(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    java.util.Map.of("message", "File ảnh không được để trống"));
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    java.util.Map.of("message", "Ảnh đại diện không được vượt quá 2MB"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    java.util.Map.of("message", "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP"));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        CustomerProfile profile = customerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        try {
            Path uploadDir = Paths.get("uploads", "avatars");
            Files.createDirectories(uploadDir);

            String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            };
            String fileName = "user_" + user.getId() + "_" + UUID.randomUUID() + extension;
            Path filePath = uploadDir.resolve(fileName).toAbsolutePath().normalize();
            file.transferTo(filePath.toFile());

            String avatarUrl = "/uploads/avatars/" + fileName;
            profile.setAvatarUrl(avatarUrl);
            customerProfileRepository.save(profile);
            return avatarUrl;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi upload ảnh đại diện: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        // Cập nhật fullName nếu có
        if (req.getFullName() != null && !req.getFullName().isBlank()) {
            user.setFullName(req.getFullName());
        }

        // Đổi mật khẩu nếu có
        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            if (req.getCurrentPassword() == null
                    || !passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS,
                        java.util.Map.of("message", "Mật khẩu hiện tại không đúng"));
            }
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        }

        userRepository.save(user);

        // Cập nhật CustomerProfile
        if (user.getRole() == com.example.TicketRush_backend.enums.UserRole.CUSTOMER) {
            customerProfileRepository.findByUserId(userId).ifPresent(profile -> {
                if (req.getPhone() != null)       profile.setPhone(blankToNull(req.getPhone()));
                if (req.getDateOfBirth() != null) profile.setDateOfBirth(req.getDateOfBirth());
                if (req.getGender() != null)      profile.setGender(req.getGender());
                customerProfileRepository.save(profile);
            });
        }
    }

    @Transactional
    public void seedAdmin(String email, String password) {
        if (!userRepository.existsByEmail(email)) {
            User admin = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .fullName("System Administrator")
                    .role(UserRole.ADMIN)
                    .build();
            userRepository.save(admin);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String generateOtp() {
        int bound = (int) Math.pow(10, OTP_DIGITS);
        int value = SECURE_RANDOM.nextInt(bound);
        return String.format("%0" + OTP_DIGITS + "d", value);
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    Map.of("message", "Mật khẩu mới phải có ít nhất 8 ký tự"));
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    Map.of("message", "Mật khẩu mới cần ít nhất một chữ hoa"));
        }
        if (!password.matches(".*[a-z].*")) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    Map.of("message", "Mật khẩu mới cần ít nhất một chữ thường"));
        }
        if (!password.matches(".*[0-9].*")) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    Map.of("message", "Mật khẩu mới cần ít nhất một chữ số"));
        }
        if (!password.matches(".*[^A-Za-z0-9].*")) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    Map.of("message", "Mật khẩu mới cần ít nhất một ký tự đặc biệt"));
        }
    }
}
