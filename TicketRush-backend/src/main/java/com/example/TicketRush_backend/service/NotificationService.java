package com.example.TicketRush_backend.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.notification.NotificationResponse;
import com.example.TicketRush_backend.entity.AppNotification;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.NotificationType;
import com.example.TicketRush_backend.enums.UserRole;
import com.example.TicketRush_backend.repository.NotificationRepository;
import com.example.TicketRush_backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Long userId, Pageable pageable) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> unreadCount(Long userId) {
        return Map.of("count", notificationRepository.countByRecipientIdAndReadAtIsNull(userId));
    }

    @Transactional
    public NotificationResponse markRead(Long notificationId, Long userId) {
        AppNotification notification = notificationRepository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }
        return NotificationResponse.from(notification);
    }

    @Transactional
    public void markAllRead(Long userId) {
        Instant now = Instant.now();
        List<AppNotification> unread = notificationRepository.findByRecipientIdAndReadAtIsNull(userId);
        for (AppNotification notification : unread) {
            notification.setReadAt(now);
        }
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteOne(Long notificationId, Long userId) {
        AppNotification notification = notificationRepository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteSelected(List<Long> notificationIds, Long userId) {
        if (notificationIds == null || notificationIds.isEmpty()) {
            return;
        }
        List<AppNotification> notifications = notificationRepository.findByIdInAndRecipientId(notificationIds, userId);
        notificationRepository.deleteAll(notifications);
    }

    @Transactional
    public void deleteAllForUser(Long userId) {
        List<AppNotification> notifications = notificationRepository.findByRecipientId(userId);
        notificationRepository.deleteAll(notifications);
    }

    @Transactional
    public NotificationResponse createForUser(
            User recipient,
            NotificationType type,
            String title,
            String message,
            String linkUrl,
            Long eventId,
            Long orderId) {

        AppNotification notification = AppNotification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .linkUrl(linkUrl)
                .eventId(eventId)
                .orderId(orderId)
                .createdAt(Instant.now())
                .build();
        notification = notificationRepository.save(notification);

        NotificationResponse response = NotificationResponse.from(notification);
        broadcastAfterCommit(recipient.getId(), response);
        return response;
    }

    @Transactional
    public void createForAdmins(
            NotificationType type,
            String title,
            String message,
            String linkUrl,
            Long eventId,
            Long orderId) {

        for (User admin : userRepository.findByRole(UserRole.ADMIN)) {
            createForUser(admin, type, title, message, linkUrl, eventId, orderId);
        }
    }

    @Transactional
    public void createReminderIfAbsent(User recipient, Long eventId, String title, String message, String linkUrl) {
        if (notificationRepository.existsByRecipientIdAndTypeAndEventId(
                recipient.getId(), NotificationType.EVENT_REMINDER_24H, eventId)) {
            return;
        }
        createForUser(recipient, NotificationType.EVENT_REMINDER_24H, title, message, linkUrl, eventId, null);
    }

    private void broadcastAfterCommit(Long recipientId, NotificationResponse response) {
        Runnable send = () -> messagingTemplate.convertAndSend("/topic/notifications/users/" + recipientId, response);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
            return;
        }

        send.run();
    }
}
