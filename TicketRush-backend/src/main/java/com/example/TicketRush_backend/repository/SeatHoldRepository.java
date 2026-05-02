package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.SeatHold;
import com.example.TicketRush_backend.enums.HoldStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

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
    @Query("SELECT h FROM SeatHold h WHERE h.status = 'ACTIVE' AND h.expiresAt < :now")
    List<SeatHold> findExpiredActiveHolds(@Param("now") Instant now);
}
