package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findFirstByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("""
            update PasswordResetOtp otp
            set otp.usedAt = :usedAt
            where otp.user.id = :userId and otp.usedAt is null
            """)
    int markActiveOtpsUsed(@Param("userId") Long userId, @Param("usedAt") Instant usedAt);
}
