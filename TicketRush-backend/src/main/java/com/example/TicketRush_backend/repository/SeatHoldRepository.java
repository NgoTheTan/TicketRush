package com.example.TicketRush_backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.TicketRush_backend.entity.SeatHold;
import com.example.TicketRush_backend.enums.HoldStatus;

public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {

    /**
     * Tìm hold ACTIVE của user cho một event.
     * Dùng khi user hold thêm ghế thứ 2 (append vào hold cũ).
     */
    Optional<SeatHold> findByUserIdAndEventIdAndStatus(
            Long userId, Long eventId, HoldStatus status);

    /**
     * Scheduler: tìm tất cả ACTIVE holds đã hết hạn.
     */
    List<SeatHold> findByStatusAndExpiresAtBefore(
            HoldStatus status,
            Instant now
    );

    List<SeatHold> findByEventId(Long eventId);
}
