package com.example.TicketRush_backend;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import com.example.TicketRush_backend.dto.event.EventResponse;
import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.UserRole;
import com.example.TicketRush_backend.repository.EventRepository;
import com.example.TicketRush_backend.repository.UserRepository;
import com.example.TicketRush_backend.service.EventService;

@SpringBootTest
@Transactional
class EventControllerDateFilterTests {

    private static final ZoneId EVENT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    private EventService eventService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void listEventsFiltersByDateRange() {
        String suffix = UUID.randomUUID().toString();
        String eventName = "Date Filter Test " + suffix;

        User admin = userRepository.save(User.builder()
                .email("date-filter-" + suffix + "@example.com")
                .password("password")
                .fullName("Date Filter Admin")
                .role(UserRole.ADMIN)
                .build());

        eventRepository.save(Event.builder()
                .name(eventName)
                .category("Other")
                .venue("Test Venue")
                .city("Test City")
                .eventDate(LocalDate.of(2026, 5, 31).atTime(20, 0).atZone(EVENT_ZONE).toInstant())
                .status(EventStatus.ON_SALE)
                .createdBy(admin)
                .build());

        Page<EventResponse> outsideRange = eventService.listPublicEvents(
                eventName, null, null,
                LocalDate.of(1900, 1, 1),
                LocalDate.of(1900, 1, 2),
                PageRequest.of(0, 12));

        assertEquals(0, outsideRange.getTotalElements());

        Page<EventResponse> insideRange = eventService.listPublicEvents(
                eventName, null, null,
                LocalDate.of(2026, 5, 31),
                LocalDate.of(2026, 5, 31),
                PageRequest.of(0, 12));

        assertEquals(1, insideRange.getTotalElements());
        assertEquals(eventName, insideRange.getContent().getFirst().getName());
    }
}
