package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.QueueSession;
import com.example.TicketRush_backend.enums.QueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QueueSessionRepository extends JpaRepository<QueueSession, Long> {

    /** Tìm session của user trong event với status cụ thể */
    Optional<QueueSession> findByUserIdAndEventIdAndStatus(
            Long userId, Long eventId, QueueStatus status);

    /** Tìm theo queue token (cho polling endpoint) */
    Optional<QueueSession> findByQueueToken(UUID token);

    /** Đếm số session WAITING trong event — cho hiển thị queue length */
    long countByEventIdAndStatus(Long eventId, QueueStatus status);

    /** Lấy danh sách WAITING theo thứ tự position — dùng cho batch admit */
    List<QueueSession> findByEventIdAndStatusOrderByPositionAsc(
            Long eventId, QueueStatus status);

    /** Tìm ADMITTED sessions đã hết hạn — Scheduler expire */
    @Query("SELECT q FROM QueueSession q WHERE q.status = 'ADMITTED' AND q.accessExpiresAt < :now")
    List<QueueSession> findExpiredAdmittedSessions(@Param("now") Instant now);

    /** Position lớn nhất hiện tại trong event — để assign position cho user mới */
    @Query("SELECT COALESCE(MAX(q.position), 0) FROM QueueSession q WHERE q.event.id = :eventId")
    int findMaxPositionByEventId(@Param("eventId") Long eventId);

    /** Kiểm tra user có đang WAITING hoặc ADMITTED trong event không */
    boolean existsByUserIdAndEventIdAndStatusIn(
            Long userId, Long eventId, List<QueueStatus> statuses);

    List<QueueSession> findByEventId(Long eventId);
}
