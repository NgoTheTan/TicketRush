package com.example.TicketRush_backend.security;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class GoogleTokenVerifier {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> TRUSTED_ISSUERS = Set.of(
            "https://accounts.google.com",
            "accounts.google.com"
    );

    private final String clientId;
    private final JwtDecoder jwtDecoder;

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.jwtDecoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();
    }

    public GoogleUserInfo verify(String credential) {
        if (clientId.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    Map.of("message", "Backend chưa cấu hình GOOGLE_CLIENT_ID"));
        }

        try {
            Jwt jwt = jwtDecoder.decode(credential);
            validateIssuer(jwt);
            validateAudience(jwt);

            Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
            String email = trim(jwt.getClaimAsString("email"));
            if (!Boolean.TRUE.equals(emailVerified) || email.isBlank()) {
                throw invalidGoogleToken();
            }

            String fullName = trim(jwt.getClaimAsString("name"));
            String pictureUrl = trim(jwt.getClaimAsString("picture"));
            return new GoogleUserInfo(
                    email.toLowerCase(Locale.ROOT),
                    fullName.isBlank() ? email : fullName,
                    pictureUrl
            );
        } catch (JwtException | IllegalArgumentException ex) {
            throw invalidGoogleToken();
        }
    }

    private void validateIssuer(Jwt jwt) {
        String issuer = jwt.getIssuer() == null ? "" : jwt.getIssuer().toString();
        if (!TRUSTED_ISSUERS.contains(issuer)) {
            throw invalidGoogleToken();
        }
    }

    private void validateAudience(Jwt jwt) {
        List<String> audience = jwt.getAudience();
        if (audience == null || !audience.contains(clientId)) {
            throw invalidGoogleToken();
        }
    }

    private AppException invalidGoogleToken() {
        return new AppException(ErrorCode.AUTH_GOOGLE_TOKEN_INVALID);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    public record GoogleUserInfo(String email, String fullName, String pictureUrl) {
    }
}
