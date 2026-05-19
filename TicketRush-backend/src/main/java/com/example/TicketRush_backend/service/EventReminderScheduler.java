package com.example.TicketRush_backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.TicketStatus;
import com.example.TicketRush_backend.repository.EventRepository;
import com.example.TicketRush_backend.repository.TicketRepository;
import com.example.TicketRush_backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class EventReminderScheduler {

    private final TicketRepository ticketRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Scheduled(fixedDelay = 15 * 60 * 1000L, initialDelay = 60_000L)
    @Transactional
    public void send24HourEventReminders() {
        Instant now = Instant.now();
        Instant latest = now.plus(24, ChronoUnit.HOURS);
        List<Object[]> recipients = ticketRepository.findValidTicketRecipientsForEventsBetween(
                TicketStatus.VALID,
                List.of(EventStatus.CANCELLED, EventStatus.ENDED),
                now,
                latest);

        for (Object[] row : recipients) {
            Long userId = (Long) row[0];
            Long eventId = (Long) row[1];

            User user = userRepository.findById(userId).orElse(null);
            Event event = eventRepository.findById(eventId).orElse(null);
            if (user == null || event == null) continue;

            notificationService.createReminderIfAbsent(
                    user,
                    eventId,
                    "Sự kiện sắp diễn ra",
                    "Sự kiện \"" + event.getName() + "\" sẽ diễn ra trong vòng 24 giờ tới tại " + event.getVenue() + ".",
                    "/events/" + eventId);
        }

        if (!recipients.isEmpty()) {
            log.info("[Notifications] Checked {} event reminder recipient(s)", recipients.size());
        }
    }
}
