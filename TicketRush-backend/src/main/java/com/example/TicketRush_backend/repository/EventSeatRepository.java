package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.enums.SeatStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {

    List<EventSeat> findByEventId(Long eventId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM EventSeat s WHERE s.id = :id")
    Optional<EventSeat> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT COUNT(s) FROM EventSeat s WHERE s.event.id = :eventId AND s.heldBy.id = :userId AND s.status = 'LOCKED'")
    int countLockedByUserInEvent(@Param("eventId") Long eventId, @Param("userId") Long userId);

    @Query("SELECT s FROM EventSeat s WHERE s.status = 'LOCKED' AND s.heldUntil < :now")
    List<EventSeat> findExpiredLocks(@Param("now") Instant now);

    long countByEventIdAndStatus(Long eventId, SeatStatus status);

    // ── Sprint 4: Zone-level analytics ────────────────────────

    /**
     * Thống kê số ghế SOLD theo zone cho dashboard fill rate breakdown.
     * Trả về Object[]{zoneId (Long), soldCount (Long), revenue (BigDecimal)}
     */
    @Query(value = """
        SELECT es.zone_id,
               COUNT(*)        AS sold_count,
               COALESCE(SUM(es.price_at_sale), 0) AS zone_revenue
        FROM event_seats es
        WHERE es.event_id = :eventId
          AND es.status   = 'SOLD'
        GROUP BY es.zone_id
    """, nativeQuery = true)
    List<Object[]> findSoldStatsByZone(@Param("eventId") Long eventId);

    /** Tổng số ghế theo zone */
    long countByEventIdAndZoneId(Long eventId, Long zoneId);
}
