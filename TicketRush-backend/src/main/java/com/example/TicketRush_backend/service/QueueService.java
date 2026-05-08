package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.queue.JoinQueueResponse;
import com.example.TicketRush_backend.dto.queue.QueuePositionResponse;
import com.example.TicketRush_backend.dto.queue.QueueStatusResponse;
import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.QueueSession;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.QueueStatus;
import com.example.TicketRush_backend.repository.EventRepository;
import com.example.TicketRush_backend.repository.QueueSessionRepository;
import com.example.TicketRush_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueSessionRepository queueSessionRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Value("${app.queue.batch-size:50}")
    private int batchSize;

    @Value("${app.queue.batch-interval-ms:5000}")
    private long batchIntervalMs;

    @Value("${app.queue.access-token-ttl-minutes:15}")
    private int accessTokenTtlMinutes;

    // ── Public: Check Queue Status ─────────────────────────────

    /**
     * GET /api/v1/queue/{eventId}/status
     * Frontend gọi khi user muốn vào seat selection.
     * Trả về queue active hay không và số người đang chờ.
     */
    @Transactional(readOnly = true)
    public QueueStatusResponse getQueueStatus(Long eventId) {
        Event event = findEvent(eventId);
        long queueLength = queueSessionRepository
                .countByEventIdAndStatus(eventId, QueueStatus.WAITING);

        // Ước tính: mỗi batchSize người được admit sau batchIntervalMs
        long estimatedWaitMinutes = queueLength == 0 ? 0
                : (long) Math.ceil((double) queueLength / batchSize
                        * batchIntervalMs / 60_000);

        return QueueStatusResponse.builder()
                .eventId(eventId)
                .queueActive(event.isQueueActive())
                .currentQueueLength(queueLength)
                .estimatedWaitMinutes(estimatedWaitMinutes)
                .build();
    }

    // ── Customer: Join Queue ───────────────────────────────────

    /**
     * POST /api/v1/queue/{eventId}/join
     * User tham gia hàng chờ. Nếu đã đang WAITING/ADMITTED → lỗi.
     */
    @Transactional
    public JoinQueueResponse joinQueue(Long eventId, Long userId) {
        Event event = findEvent(eventId);

        // Queue không active → không cần join
        if (!event.isQueueActive()) {
            throw new AppException(ErrorCode.QUEUE_NOT_ACTIVE);
        }

        // Kiểm tra user đã đang WAITING hoặc ADMITTED chưa
        boolean alreadyInQueue = queueSessionRepository
                .existsByUserIdAndEventIdAndStatusIn(
                        userId, eventId,
                        List.of(QueueStatus.WAITING, QueueStatus.ADMITTED));
        if (alreadyInQueue) {
            throw new AppException(ErrorCode.QUEUE_ALREADY_JOINED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        // Gán position tiếp theo
        int nextPosition = queueSessionRepository.findMaxPositionByEventId(eventId) + 1;

        // Ước tính thời gian chờ (giây)
        long waitSeconds = (long) Math.ceil((double) nextPosition / batchSize)
                * (batchIntervalMs / 1_000);

        QueueSession session = QueueSession.builder()
                .user(user)
                .event(event)
                .position(nextPosition)
                .status(QueueStatus.WAITING)
                .build();
        session = queueSessionRepository.save(session);

        log.info("[Queue] User={} joined queue for event={} at position={}", userId, eventId, nextPosition);

        return JoinQueueResponse.builder()
                .sessionId(session.getId())
                .queueToken(session.getQueueToken())
                .position(session.getPosition())
                .estimatedWaitSeconds(waitSeconds)
                .joinedAt(session.getJoinedAt())
                .build();
    }

    // ── Customer: Poll Position ────────────────────────────────

    /**
     * GET /api/v1/queue/position/{queueToken}
     * Frontend polling mỗi 3 giây.
     * Khi ADMITTED: trả về accessToken và validUntil.
     */
    @Transactional(readOnly = true)
    public QueuePositionResponse getPosition(UUID queueToken) {
        QueueSession session = queueSessionRepository.findByQueueToken(queueToken)
                .orElseThrow(() -> new AppException(ErrorCode.QUEUE_SESSION_NOT_FOUND));

        if (session.getStatus() == QueueStatus.EXPIRED) {
            throw new AppException(ErrorCode.QUEUE_TOKEN_EXPIRED);
        }
        if (session.getStatus() == QueueStatus.CANCELLED) {
            throw new AppException(ErrorCode.QUEUE_TOKEN_INVALID);
        }
        if (session.getStatus() == QueueStatus.ADMITTED) {
            // Kiểm tra accessToken còn hạn không
            if (session.getAccessExpiresAt() != null
                    && session.getAccessExpiresAt().isBefore(Instant.now())) {
                throw new AppException(ErrorCode.QUEUE_TOKEN_EXPIRED);
            }
            return QueuePositionResponse.builder()
                    .status(QueueStatus.ADMITTED)
                    .position(0)
                    .estimatedWaitSeconds(0)
                    .accessToken(session.getQueueToken().toString())
                    .accessExpiresAt(session.getAccessExpiresAt())
                    .build();
        }

        // WAITING: tính vị trí thực tế
        long aheadCount = queueSessionRepository
                .countByEventIdAndStatus(session.getEvent().getId(), QueueStatus.WAITING);
        long waitSeconds = (long) Math.ceil((double) aheadCount / batchSize)
                * (batchIntervalMs / 1_000);

        return QueuePositionResponse.builder()
                .status(QueueStatus.WAITING)
                .position(session.getPosition())
                .estimatedWaitSeconds(waitSeconds)
                .build();
    }

    // ── Admin: Toggle Queue ────────────────────────────────────

    /**
     * PATCH /api/v1/admin/events/{eventId}/queue?active=true|false
     * Admin bật/tắt queue cho sự kiện.
     */
    @Transactional
    public void setQueueActive(Long eventId, boolean active) {
        Event event = findEvent(eventId);
        event.setQueueActive(active);
        eventRepository.save(event);
        log.info("[Queue] Event={} queue set to active={}", eventId, active);
    }

    // ── Scheduler: Batch Admit ─────────────────────────────────

    /**
     * Mỗi batchIntervalMs, admit batchSize users tiếp theo từ hàng chờ.
     * Đây là "pump" của virtual queue.
     */
    @Scheduled(fixedDelayString = "${app.queue.batch-interval-ms:5000}")
    @Transactional
    public void admitNextBatch() {
        // Tìm tất cả event đang có queue active và còn người WAITING
        // Simplified: lấy tất cả WAITING sessions, sort theo position, admit top batchSize
        List<QueueSession> waitingSessions = queueSessionRepository
                .findAll()
                .stream()
                .filter(s -> s.getStatus() == QueueStatus.WAITING
                        && s.getEvent().isQueueActive())
                .sorted(java.util.Comparator.comparingInt(QueueSession::getPosition))
                .limit(batchSize)
                .toList();

        if (waitingSessions.isEmpty()) return;

        Instant admittedAt = Instant.now();
        Instant accessExpires = admittedAt.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES);

        for (QueueSession session : waitingSessions) {
            session.setStatus(QueueStatus.ADMITTED);
            session.setAdmittedAt(admittedAt);
            session.setAccessExpiresAt(accessExpires);
            queueSessionRepository.save(session);
            log.debug("[Queue] Admitted session={} user={} event={}",
                    session.getId(), session.getUser().getId(), session.getEvent().getId());
        }

        log.info("[Queue] Admitted {} session(s) in batch", waitingSessions.size());
    }

    /**
     * Mỗi phút, expire các ADMITTED sessions đã hết accessExpiresAt.
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireAdmittedSessions() {
        List<QueueSession> expired = queueSessionRepository
                .findExpiredAdmittedSessions(Instant.now());
        for (QueueSession session : expired) {
            session.setStatus(QueueStatus.EXPIRED);
            queueSessionRepository.save(session);
        }
        if (!expired.isEmpty()) {
            log.info("[Queue] Expired {} admitted session(s)", expired.size());
        }
    }

    // ── Helpers ───────────────────────────────────────────────

    private Event findEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
    }
}
