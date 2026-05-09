package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.event.CreateEventRequest;
import com.example.TicketRush_backend.dto.event.EventResponse;
import com.example.TicketRush_backend.dto.event.UpdateEventRequest;
import com.example.TicketRush_backend.dto.seat.CreateSeatZonesRequest;
import com.example.TicketRush_backend.dto.seat.SeatZoneResponse;
import com.example.TicketRush_backend.entity.*;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final SeatZoneRepository seatZoneRepository;
    private final EventSeatRepository eventSeatRepository;
    private final UserRepository userRepository;

    // ── Public / Customer ──────────────────────────────────────

    public Page<EventResponse> listPublicEvents(String search, Pageable pageable) {
        Page<Event> page;
        if (search != null && !search.isBlank()) {
            page = eventRepository.findByStatusAndNameContainingIgnoreCase(
                    EventStatus.ON_SALE, search, pageable);
        } else {
            page = eventRepository.findByStatus(EventStatus.ON_SALE, pageable);
        }
        return page.map(this::toSummaryResponse);
    }

    public EventResponse getEventDetail(Long eventId) {
        Event event = findOrThrow(eventId);
        return toDetailResponse(event);
    }

    // ── Admin ──────────────────────────────────────────────────

    public Page<EventResponse> listAllEvents(String search, EventStatus status, Pageable pageable) {
        Page<Event> page;
        if (search != null && !search.isBlank()) {
            page = eventRepository.findByNameContainingIgnoreCase(search, pageable);
        } else if (status != null) {
            page = eventRepository.findByStatus(status, pageable);
        } else {
            page = eventRepository.findAll(pageable);
        }
        return page.map(this::toAdminSummaryResponse);
    }

    @Transactional
    public EventResponse createEvent(CreateEventRequest req, Long adminUserId) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        Event event = Event.builder()
                .name(req.getName())
                .description(req.getDescription())
                .venue(req.getVenue())
                .eventDate(req.getEventDate())
                .imageUrl(req.getImageUrl())
                .status(EventStatus.UPCOMING)
                .createdBy(admin)
                .build();

        return EventResponse.basic(eventRepository.save(event));
    }

    @Transactional
    public EventResponse updateEvent(Long eventId, UpdateEventRequest req) {
        Event event = findOrThrow(eventId);

        if (req.getName() != null)        event.setName(req.getName());
        if (req.getDescription() != null) event.setDescription(req.getDescription());
        if (req.getVenue() != null)       event.setVenue(req.getVenue());
        if (req.getEventDate() != null)   event.setEventDate(req.getEventDate());
        if (req.getImageUrl() != null)    event.setImageUrl(req.getImageUrl());

        return EventResponse.basic(eventRepository.save(event));
    }

    @Transactional
    public EventResponse changeStatus(Long eventId, EventStatus targetStatus) {
        Event event = findOrThrow(eventId);
        validateTransition(event.getStatus(), targetStatus);
        event.setStatus(targetStatus);
        return EventResponse.basic(eventRepository.save(event));
    }

    // ── Seat Zone + Seat generation ────────────────────────────

    public List<SeatZoneResponse> getSeatZones(Long eventId) {
        findOrThrow(eventId);
        return seatZoneRepository.findByEventId(eventId).stream()
                .map(z -> SeatZoneResponse.from(z, eventSeatRepository))
                .toList();
    }

    @Transactional
    public Map<String, Object> saveSeatZones(Long eventId, CreateSeatZonesRequest req) {
        Event event = findOrThrow(eventId);

        if (event.getStatus() != EventStatus.UPCOMING) {
            throw new AppException(ErrorCode.SEAT_CONFIG_LOCKED,
                    Map.of("eventStatus", event.getStatus()));
        }

        // Delete existing config for this event
        eventSeatRepository.deleteAll(eventSeatRepository.findByEventId(eventId));
        seatZoneRepository.deleteByEventId(eventId);

        List<SeatZone> createdZones = new ArrayList<>();
        int totalSeats = 0;

        for (CreateSeatZonesRequest.ZoneConfig cfg : req.getZones()) {
            SeatZone zone = SeatZone.builder()
                    .event(event)
                    .name(cfg.getName())
                    .price(cfg.getPrice())
                    .totalRows(cfg.getTotalRows())
                    .seatsPerRow(cfg.getSeatsPerRow())
                    .colorCode(cfg.getColorCode())
                    .build();
            zone = seatZoneRepository.save(zone);
            createdZones.add(zone);

            // Generate EventSeat records
            List<EventSeat> seats = generateSeats(event, zone, cfg);
            eventSeatRepository.saveAll(seats);
            totalSeats += seats.size();
        }

        return Map.of(
                "eventId", eventId,
                "zonesCreated", createdZones.size(),
                "totalSeatsGenerated", totalSeats,
                "zones", createdZones.stream().map(z ->
                        Map.of("zoneId", z.getId(),
                               "name", z.getName(),
                               "price", z.getPrice(),
                               "totalSeats", z.getTotalRows() * z.getSeatsPerRow())).toList()
        );
    }

    // ── Helpers ───────────────────────────────────────────────

    private List<EventSeat> generateSeats(Event event, SeatZone zone,
                                           CreateSeatZonesRequest.ZoneConfig cfg) {
        List<EventSeat> seats = new ArrayList<>();
        for (int row = 0; row < cfg.getTotalRows(); row++) {
            String rowLabel = rowLabel(row);
            for (int seatNum = 1; seatNum <= cfg.getSeatsPerRow(); seatNum++) {
                seats.add(EventSeat.builder()
                        .event(event)
                        .zone(zone)
                        .rowLabel(rowLabel)
                        .seatNumber(seatNum)
                        .status(SeatStatus.AVAILABLE)
                        .build());
            }
        }
        return seats;
    }

    /** Row 0→A, 1→B, ..., 25→Z, 26→AA, 27→AB, ... */
    private String rowLabel(int index) {
        StringBuilder sb = new StringBuilder();
        do {
            sb.insert(0, (char) ('A' + index % 26));
            index = index / 26 - 1;
        } while (index >= 0);
        return sb.toString();
    }

    private void validateTransition(EventStatus current, EventStatus target) {
        boolean valid = switch (current) {
            case UPCOMING  -> target == EventStatus.ON_SALE  || target == EventStatus.CANCELLED;
            case ON_SALE   -> target == EventStatus.ENDED    || target == EventStatus.CANCELLED;
            case ENDED, CANCELLED -> false;
        };
        if (!valid) {
            throw new AppException(ErrorCode.EVENT_INVALID_STATUS_TRANSITION,
                    Map.of("currentStatus", current, "requestedStatus", target));
        }
    }

    private Event findOrThrow(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
    }

    private EventResponse toSummaryResponse(Event e) {
        long available = eventSeatRepository.countByEventIdAndStatus(e.getId(), SeatStatus.AVAILABLE);
        long sold      = eventSeatRepository.countByEventIdAndStatus(e.getId(), SeatStatus.SOLD);
        long total     = available + sold
                       + eventSeatRepository.countByEventIdAndStatus(e.getId(), SeatStatus.LOCKED);

        BigDecimal priceFrom = seatZoneRepository.findByEventId(e.getId()).stream()
                .map(SeatZone::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        return EventResponse.builder()
                .id(e.getId()).name(e.getName()).venue(e.getVenue())
                .eventDate(e.getEventDate()).imageUrl(e.getImageUrl())
                .status(e.getStatus()).createdAt(e.getCreatedAt())
                .totalSeats(total).availableSeats(available).soldSeats(sold)
                .priceFrom(priceFrom)
                .build();
    }

    private EventResponse toDetailResponse(Event e) {
        List<EventResponse.ZoneSummary> zones = seatZoneRepository.findByEventId(e.getId()).stream()
                .map(z -> EventResponse.ZoneSummary.from(z,
                        eventSeatRepository.countByEventIdAndZoneIdAndStatus(
                                e.getId(), z.getId(), SeatStatus.AVAILABLE),
                        eventSeatRepository.countByEventIdAndZoneIdAndStatus(
                                e.getId(), z.getId(), SeatStatus.SOLD)))
                .toList();

        return EventResponse.builder()
                .id(e.getId()).name(e.getName()).description(e.getDescription())
                .venue(e.getVenue()).eventDate(e.getEventDate()).imageUrl(e.getImageUrl())
                .status(e.getStatus()).createdAt(e.getCreatedAt())
                .zones(zones)
                .build();
    }

    private EventResponse toAdminSummaryResponse(Event e) {
        long sold    = eventSeatRepository.countByEventIdAndStatus(e.getId(), SeatStatus.SOLD);
        long locked  = eventSeatRepository.countByEventIdAndStatus(e.getId(), SeatStatus.LOCKED);
        long avail   = eventSeatRepository.countByEventIdAndStatus(e.getId(), SeatStatus.AVAILABLE);
        return EventResponse.builder()
                .id(e.getId()).name(e.getName()).venue(e.getVenue())
                .eventDate(e.getEventDate()).status(e.getStatus()).createdAt(e.getCreatedAt())
                .totalSeats(sold + locked + avail).soldSeats(sold)
                .lockedSeats(locked).availableSeats(avail)
                .build();
    }
}
