package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.QueueSession;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.QueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * QueueSessionRepository
 *
 * QUAN TRỌNG: Entity dùng @JdbcTypeCode(SqlTypes.NAMED_ENUM) cho trường status,
 * khiến Hibernate 7 tự thêm cast ::QueueStatus vào SQL (type không tồn tại trong PG).
 * Vì vậy, TẤT CẢ các query lọc theo status PHẢI dùng nativeQuery = true
 * với cú pháp status::text = 'VALUE' để tránh lỗi type casting.
 */
public interface QueueSessionRepository extends JpaRepository<QueueSession, Long> {

    Optional<QueueSession> findByQueueToken(UUID token);

    List<QueueSession> findByEventId(Long eventId);

    // Dùng native query để tránh Hibernate tạo cast sai
    @Query(value = "SELECT COUNT(*) FROM queue_sessions WHERE event_id = :eventId AND status::text = :status",
           nativeQuery = true)
    long countByEventIdAndStatus(@Param("eventId") Long eventId, @Param("status") String status);

    // ── Idempotent join (event queue) ──────────────────────────
    // Native query để tránh JPQL enum casting issue với NAMED_ENUM
    @Query(value = """
                SELECT * FROM queue_sessions
                WHERE user_id = :userId
                  AND event_id = :eventId
                  AND status::text IN ('WAITING', 'ADMITTED')
                ORDER BY id DESC
            """, nativeQuery = true)
    List<QueueSession> findByUserIdAndEventIdAndStatusIn(
            @Param("userId") Long userId,
            @Param("eventId") Long eventId);

    // ── System queue (event_id IS NULL) ───────────────────────

    /**
     * Tìm system queue sessions của user còn hợp lệ (WAITING hoặc ADMITTED).
     * Native query để tránh lỗi JPQL enum cast với PostgreSQL NAMED_ENUM.
     */
    @Query(value = """
                SELECT * FROM queue_sessions
                WHERE user_id = :userId
                  AND event_id IS NULL
                  AND status::text IN ('WAITING', 'ADMITTED')
                ORDER BY id DESC
            """, nativeQuery = true)
    List<QueueSession> findSystemQueueActiveByUserId(@Param("userId") Long userId);

    /** Đếm system queue sessions WAITING */
    @Query(value = """
                SELECT COUNT(*) FROM queue_sessions
                WHERE event_id IS NULL AND status::text = 'WAITING'
            """, nativeQuery = true)
    long countSystemQueueWaiting();

    /** Position lớn nhất của system queue */
    @Query(value = """
                SELECT COALESCE(MAX(position), 0) FROM queue_sessions WHERE event_id IS NULL
            """, nativeQuery = true)
    int findMaxSystemQueuePosition();

    /** WAITING sessions của system queue — dùng cho batch admit scheduler */
    @Query(value = """
                SELECT * FROM queue_sessions
                WHERE event_id IS NULL AND status::text = 'WAITING'
                ORDER BY position ASC
            """, nativeQuery = true)
    List<QueueSession> findWaitingSystemQueueSessions();

    // ── Position ranking ───────────────────────────────────────

    /** Tính vị trí thực tế trong event queue */
    @Query(value = """
                SELECT COUNT(*) FROM queue_sessions
                WHERE event_id = :eventId
                  AND status::text = 'WAITING'
                  AND position < :position
            """, nativeQuery = true)
    long countByEventIdAndStatusAndPositionLessThan(
            @Param("eventId") Long eventId,
            @Param("position") int position);

    /** Tính vị trí thực tế trong system queue */
    @Query(value = """
                SELECT COUNT(*) FROM queue_sessions
                WHERE event_id IS NULL AND status::text = 'WAITING' AND position < :position
            """, nativeQuery = true)
    long countSystemQueueAhead(@Param("position") int position);

    // ── Batch admit (event queues) ─────────────────────────────

    /** WAITING sessions cho ON_SALE events — native query để tránh JPQL enum cast */
    @Query(value = """
                SELECT qs.* FROM queue_sessions qs
                JOIN events e ON e.id = qs.event_id
                WHERE qs.status::text = 'WAITING'
                  AND qs.event_id IS NOT NULL
                  AND e.status::text = 'ON_SALE'
                ORDER BY qs.event_id ASC, qs.position ASC
            """, nativeQuery = true)
    List<QueueSession> findWaitingSessionsForActiveSaleEvents();

    // ── Expire ────────────────────────────────────────────────

    /** ADMITTED sessions đã hết hạn — native query để tránh JPQL enum cast */
    @Query(value = """
                SELECT * FROM queue_sessions
                WHERE status::text = 'ADMITTED'
                  AND access_expires_at < :now
            """, nativeQuery = true)
    List<QueueSession> findExpiredAdmittedSessions(@Param("now") Instant now);

    /** Position lớn nhất trong event queue */
    @Query(value = "SELECT COALESCE(MAX(position), 0) FROM queue_sessions WHERE event_id = :eventId",
           nativeQuery = true)
    int findMaxPositionByEventId(@Param("eventId") Long eventId);

    /** Check if user đã có session active trong event queue */
    @Query(value = """
                SELECT COUNT(*) > 0 FROM queue_sessions
                WHERE user_id = :userId
                  AND event_id = :eventId
                  AND status::text IN ('WAITING', 'ADMITTED')
            """, nativeQuery = true)
    boolean existsByUserIdAndEventIdAndStatusIn(
            @Param("userId") Long userId,
            @Param("eventId") Long eventId);
}