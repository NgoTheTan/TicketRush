package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.queue.JoinQueueResponse;
import com.example.TicketRush_backend.dto.queue.QueuePositionResponse;
import com.example.TicketRush_backend.dto.queue.QueueStatusResponse;
import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.QueueSession;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.EventStatus;
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
import java.util.Optional;
import java.util.UUID;

/**
 * QueueService — Virtual Waiting Room (Sprint 3, redesigned)
 *
 * THIẾT KẾ MỚI: Queue LUÔN LUÔN bật cho mọi event ON_SALE.
 * - Ít người → admitted nhanh trong vài giây (batchIntervalMs)
 * - Đông người → giữ đúng thứ tự, hiển thị vị trí
 * - Mọi user đều phải qua queue trước khi vào seat selection
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueSessionRepository queueSessionRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Value("${app.queue.batch-size:50}")
    private int batchSize;

    @Value("${app.queue.batch-interval-ms:3000}")
    private long batchIntervalMs;

    @Value("${app.queue.access-token-ttl-minutes:15}")
    private int accessTokenTtlMinutes;

    // ── Public: Queue status ───────────────────────────────────

    /**
     * GET /api/v1/queue/{eventId}/status
     * Queue luôn active cho ON_SALE events.
     */
    @Transactional(readOnly = true)
    public QueueStatusResponse getQueueStatus(Long eventId) {
        Event event = findEvent(eventId);
        long queueLength = queueSessionRepository
                .countByEventIdAndStatus(eventId, "WAITING");

        long estimatedWaitSeconds = queueLength == 0 ? 0
                : (long) Math.ceil((double) queueLength / batchSize) * (batchIntervalMs / 1_000);

        // Queue luôn active với ON_SALE events
        boolean queueActive = event.getStatus() == EventStatus.ON_SALE;

        return QueueStatusResponse.builder()
                .eventId(eventId)
                .queueActive(queueActive)
                .currentQueueLength(queueLength)
                .estimatedWaitMinutes(estimatedWaitSeconds / 60)
                .build();
    }

    // ── Customer: Join or resume queue ─────────────────────────

    /**
     * POST /api/v1/queue/{eventId}/join
     *
     * Luôn cho phép join với ON_SALE events.
     * Nếu user đã có session WAITING/ADMITTED → trả về session cũ (idempotent).
     * Nếu chưa có → tạo mới và gán position.
     */
    @Transactional
    public JoinQueueResponse joinQueue(Long eventId, Long userId) {
        Event event = findEvent(eventId);

        if (event.getStatus() != EventStatus.ON_SALE) {
            throw new AppException(ErrorCode.EVENT_NOT_ON_SALE,
                    java.util.Map.of("eventStatus", event.getStatus()));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        // Idempotent: trả lại session cũ nếu còn hợp lệ
        Optional<QueueSession> existing = queueSessionRepository
                .findByUserIdAndEventIdAndStatusIn(userId, eventId)
                .stream().findFirst();

        if (existing.isPresent()) {
            QueueSession session = existing.get();

            // Nếu ADMITTED nhưng đã hết hạn → tạo lại
            if (session.getStatus() == QueueStatus.ADMITTED
                    && session.getAccessExpiresAt() != null
                    && session.getAccessExpiresAt().isBefore(Instant.now())) {
                session.setStatus(QueueStatus.EXPIRED);
                queueSessionRepository.save(session);
                // fall through to create new session
            } else {
                // Trả lại session còn hợp lệ
                log.info("[Queue] User={} resuming existing session={} status={} event={}",
                        userId, session.getId(), session.getStatus(), eventId);
                return toJoinResponse(session);
            }
        }

        // Tạo session mới
        int nextPosition = queueSessionRepository.findMaxPositionByEventId(eventId) + 1;

        QueueSession session = QueueSession.builder()
                .user(user)
                .event(event)
                .position(nextPosition)
                .status(QueueStatus.WAITING)
                .build();
        session = queueSessionRepository.save(session);

        log.info("[Queue] User={} joined queue for event={} at position={}", userId, eventId, nextPosition);

        // Không admit ngay — để scheduler xử lý đồng nhất cho mọi người.
        // Mọi user đều chờ ít nhất 1 batch interval (3 giây).
        // Điều này đảm bảo công bằng tuyệt đối:
        // - Batch 1 (vị trí 1–50): cùng được admit sau ~3 giây
        // - Batch 2 (vị trí 51–100): cùng được admit sau ~6 giây
        // - Batch N: được admit sau ~N×3 giây

        return toJoinResponse(session);
    }

    // ── Customer: Poll position ────────────────────────────────

    /**
     * GET /api/v1/queue/position/{queueToken}
     * Polling mỗi 2 giây từ VirtualWaitingRoomPage.
     */
    @Transactional(readOnly = true)
    public QueuePositionResponse getPosition(UUID queueToken) {
        QueueSession session = queueSessionRepository.findByQueueToken(queueToken)
                .orElseThrow(() -> new AppException(ErrorCode.QUEUE_SESSION_NOT_FOUND));

        switch (session.getStatus()) {
            case EXPIRED -> throw new AppException(ErrorCode.QUEUE_TOKEN_EXPIRED);
            case CANCELLED -> throw new AppException(ErrorCode.QUEUE_TOKEN_INVALID);
            case ADMITTED -> {
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
            default -> {
                // WAITING: tính vị trí thực tế so với session này
                long aheadCount = (session.getEvent() == null)
                        ? queueSessionRepository.countSystemQueueAhead(session.getPosition())
                        : queueSessionRepository.countByEventIdAndStatusAndPositionLessThan(
                                session.getEvent().getId(), session.getPosition());
                long myPositionInQueue = aheadCount + 1;
                long waitSeconds = (long) Math.ceil((double) myPositionInQueue / batchSize)
                        * (batchIntervalMs / 1_000);

                return QueuePositionResponse.builder()
                        .status(QueueStatus.WAITING)
                        .position((int) myPositionInQueue)
                        .estimatedWaitSeconds(waitSeconds)
                        .build();
            }
        }
    }

    // ── Admin: Toggle queue (kept for backward compat) ─────────

    /** Không dùng nữa vì queue luôn bật. Giữ lại để không break admin API. */
    @Transactional
    public void setQueueActive(Long eventId, boolean active) {
        Event event = findEvent(eventId);
        event.setQueueActive(active);
        eventRepository.save(event);
        log.info("[Queue] Event={} queue_active set to={} (deprecated flag)", eventId, active);
    }

    // ── System Queue: Login-level ──────────────────────────────

    /**
     * POST /api/v1/queue/system/join
     * Gọi ngay sau khi đăng nhập thành công.
     *
     * Logic:
     * - Nếu user đang có session WAITING (chưa vào được) → resume (idempotent, không mất vị trí khi tải lại).
     * - Nếu user đã có session ADMITTED trước đó → coi là login mới, expire session cũ, tạo WAITING mới.
     *   Điều này đảm bảo mỗi lần đăng nhập đều phải chờ queue, tránh bypass khi TTL còn hạn.
     */
    @Transactional
    public JoinQueueResponse joinSystemQueue(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        List<QueueSession> existing = queueSessionRepository
                .findSystemQueueActiveByUserId(userId);

        if (!existing.isEmpty()) {
            QueueSession session = existing.get(0);

            // WAITING → resume (giữ vị trí khi user tải lại trang)
            if (session.getStatus() == QueueStatus.WAITING) {
                log.info("[SystemQueue] User={} resuming WAITING session={} pos={}",
                        userId, session.getId(), session.getPosition());
                return toJoinResponse(session, true);
            }

            // ADMITTED → đây là lần đăng nhập mới, expire session cũ để bắt buộc chờ lại
            if (session.getStatus() == QueueStatus.ADMITTED) {
                log.info("[SystemQueue] User={} has old ADMITTED session={}, expiring for fresh login",
                        userId, session.getId());
                session.setStatus(QueueStatus.EXPIRED);
                queueSessionRepository.save(session);
                // fall through → tạo WAITING mới
            }
        }

        int nextPos = queueSessionRepository.findMaxSystemQueuePosition() + 1;
        QueueSession session = QueueSession.builder()
                .user(user)
                .event(null)
                .position(nextPos)
                .status(QueueStatus.WAITING)
                .build();
        session = queueSessionRepository.save(session);
        log.info("[SystemQueue] User={} joined at position={}", userId, nextPos);
        return toJoinResponse(session, true);
    }

    @Transactional(readOnly = true)
    public QueueStatusResponse getSystemQueueStatus() {
        long waiting = queueSessionRepository.countSystemQueueWaiting();
        long estimatedWaitSeconds = waiting == 0 ? 0
                : (long) Math.ceil((double) waiting / batchSize) * (batchIntervalMs / 1_000);
        return QueueStatusResponse.builder()
                .eventId(null)
                .queueActive(true)
                .currentQueueLength(waiting)
                .estimatedWaitMinutes(estimatedWaitSeconds / 60)
                .build();
    }

    // ── Scheduler: Batch admit ─────────────────────────────────

    /**
     * Chạy mỗi batchIntervalMs, admit batchSize users đang WAITING cho MỌI event
     * ON_SALE.
     * Khi app ít người: interval ngắn → được admit gần như ngay lập tức.
     * Khi app đông: giữ đúng thứ tự queue.
     */
    @Scheduled(fixedDelayString = "${app.queue.batch-interval-ms:3000}")
    @Transactional
    public void admitNextBatch() {
        // Lấy WAITING sessions cho tất cả ON_SALE events, sort theo position
        // System queue batch
        List<QueueSession> sysWaiting = queueSessionRepository.findWaitingSystemQueueSessions();
        int sysAdmitted = 0;
        for (QueueSession s : sysWaiting) {
            if (sysAdmitted >= batchSize)
                break;
            admitSession(s);
            sysAdmitted++;
        }
        if (sysAdmitted > 0)
            log.info("[SystemQueue] Batch admitted {} session(s)", sysAdmitted);

        // Event queue batch
        List<QueueSession> waiting = queueSessionRepository
                .findWaitingSessionsForActiveSaleEvents();
        if (waiting.isEmpty() && sysAdmitted == 0)
            return;

        // Admit top batchSize per event để công bằng
        java.util.Map<Long, Integer> admittedPerEvent = new java.util.HashMap<>();

        for (QueueSession session : waiting) {
            Long eventId = session.getEvent().getId();
            int admitted = admittedPerEvent.getOrDefault(eventId, 0);
            if (admitted >= batchSize)
                continue;

            admitSession(session);
            admittedPerEvent.merge(eventId, 1, Integer::sum);
        }

        int total = admittedPerEvent.values().stream().mapToInt(Integer::intValue).sum();
        if (total > 0) {
            log.info("[Queue] Batch admitted {} session(s) across {} event(s)", total, admittedPerEvent.size());
        }
    }

    /**
     * Mỗi phút, expire ADMITTED sessions đã hết hạn.
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireAdmittedSessions() {
        List<QueueSession> expired = queueSessionRepository
                .findExpiredAdmittedSessions(Instant.now());
        for (QueueSession s : expired) {
            s.setStatus(QueueStatus.EXPIRED);
            queueSessionRepository.save(s);
        }
        if (!expired.isEmpty()) {
            log.info("[Queue] Expired {} admitted session(s)", expired.size());
        }
    }

    // ── Private helpers ───────────────────────────────────────

    private void admitSession(QueueSession session) {
        Instant now = Instant.now();
        Instant expires = now.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES);
        session.setStatus(QueueStatus.ADMITTED);
        session.setAdmittedAt(now);
        session.setAccessExpiresAt(expires);
        queueSessionRepository.save(session);
        // session.getEvent() có thể là null với system queue
        Long eventId = (session.getEvent() != null) ? session.getEvent().getId() : null;
        log.debug("[Queue] Admitted session={} user={} event={}",
                session.getId(), session.getUser().getId(), eventId);
    }

    private JoinQueueResponse toJoinResponse(QueueSession session) {
        return toJoinResponse(session, session.getEvent() == null);
    }

    private JoinQueueResponse toJoinResponse(QueueSession session, boolean isSystem) {
        long waitSeconds = 0;
        if (session.getStatus() == QueueStatus.WAITING) {
            long ahead = isSystem
                    ? queueSessionRepository.countSystemQueueAhead(session.getPosition())
                    : queueSessionRepository.countByEventIdAndStatusAndPositionLessThan(
                            session.getEvent().getId(), session.getPosition());
            waitSeconds = (long) Math.ceil((double) (ahead + 1) / batchSize) * (batchIntervalMs / 1_000);
        }
        return JoinQueueResponse.builder()
                .sessionId(session.getId())
                .queueToken(session.getQueueToken())
                .position(session.getPosition())
                .estimatedWaitSeconds(waitSeconds)
                .joinedAt(session.getJoinedAt())
                .build();
    }

    private Event findEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
    }
}
