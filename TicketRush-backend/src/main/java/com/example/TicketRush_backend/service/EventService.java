package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.event.CreateEventRequest;
import com.example.TicketRush_backend.dto.event.EventResponse;
import com.example.TicketRush_backend.dto.event.UpdateEventRequest;
import com.example.TicketRush_backend.dto.ws.DashboardUpdateMessage;
import com.example.TicketRush_backend.dto.ws.OrderUpdateMessage;
import com.example.TicketRush_backend.dto.seat.CreateSeatZonesRequest;
import com.example.TicketRush_backend.dto.seat.SeatZoneResponse;
import com.example.TicketRush_backend.entity.*;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.HoldStatus;
import com.example.TicketRush_backend.enums.NotificationType;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final OrderRepository orderRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final QueueSessionRepository queueSessionRepository;
    private final TicketRepository ticketRepository;
    private final SeatBroadcastService seatBroadcastService;
    private final NotificationService notificationService;

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

    public List<Map<String, Object>> suggestEvents(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }
        String safeKeyword = keyword.trim();
        List<Event> events = eventRepository.findSuggestions(safeKeyword);
        return events.stream()
                .map(e -> {
                    Map<String, Object> eventMap = new java.util.HashMap<>();
                    eventMap.put("id", e.getId());
                    eventMap.put("name", e.getName());
                    eventMap.put("imageUrl", e.getImageUrl() != null ? e.getImageUrl() : "");
                    eventMap.put("venue", e.getVenue() != null ? e.getVenue() : "");
                    return eventMap;
                })
                .toList();
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
                .locationUrl(req.getLocationUrl())
                .status(EventStatus.UPCOMING)
                .createdBy(admin)
                .build();

        Event saved = eventRepository.save(event);
        seatBroadcastService.broadcastEventListUpdate();
        return EventResponse.basic(saved);
    }

    @Transactional
    public EventResponse updateEvent(Long eventId, UpdateEventRequest req) {
        Event event = findOrThrow(eventId);

        if (req.getName() != null)        event.setName(req.getName());
        if (req.getDescription() != null) event.setDescription(req.getDescription());
        if (req.getVenue() != null)       event.setVenue(req.getVenue());
        if (req.getEventDate() != null)   event.setEventDate(req.getEventDate());
        if (req.getImageUrl() != null)    event.setImageUrl(req.getImageUrl());
        if (req.getLocationUrl() != null) event.setLocationUrl(req.getLocationUrl());

        Event saved = eventRepository.save(event);
        seatBroadcastService.broadcastEventListUpdate();
        return EventResponse.basic(saved);
    }

    @Transactional
    public EventResponse changeStatus(Long eventId, EventStatus targetStatus) {
        Event event = findOrThrow(eventId);
        validateTransition(event.getStatus(), targetStatus);
        if (targetStatus == EventStatus.CANCELLED) {
            cancelOrdersRefundAndReleaseSeats(event);
        }
        event.setStatus(targetStatus);
        Event saved = eventRepository.save(event);
        seatBroadcastService.broadcastEventListUpdate();
        if (targetStatus == EventStatus.CANCELLED) {
            broadcastDashboardStats(eventId);
        }
        return EventResponse.basic(saved);
    }

    @Transactional
    public void deleteEvent(Long eventId) {
        Event event = findOrThrow(eventId);

        // Chỉ chặn xoá sự kiện đang mở bán (ON_SALE)
        if (event.getStatus() == EventStatus.ON_SALE) {
            throw new AppException(ErrorCode.EVENT_INVALID_STATUS_TRANSITION,
                    Map.of("reason", "Không thể xoá sự kiện đang mở bán. Hãy hủy hoặc kết thúc sự kiện trước."));
        }

        // Kiểm tra không có đơn hàng PAID nào liên quan
        boolean hasPaidOrders = orderRepository.existsByEventIdAndStatus(eventId, OrderStatus.PAID);
        if (hasPaidOrders) {
            throw new AppException(ErrorCode.EVENT_INVALID_STATUS_TRANSITION,
                    Map.of("reason", "Không thể xoá sự kiện đã có đơn hàng thanh toán"));
        }

        // Xoá dữ liệu liên quan theo thứ tự đảm bảo toàn vẹn khóa ngoại
        queueSessionRepository.deleteAll(queueSessionRepository.findByEventId(eventId));
        ticketRepository.deleteAll(ticketRepository.findByEventId(eventId));
        orderRepository.deleteAll(orderRepository.findByEventId(eventId));
        seatHoldRepository.deleteAll(seatHoldRepository.findByEventId(eventId));
        eventSeatRepository.deleteAll(eventSeatRepository.findByEventId(eventId));
        seatZoneRepository.deleteByEventId(eventId);
        eventRepository.delete(event);
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
        if (cfg.getCustomSeats() != null && !cfg.getCustomSeats().isEmpty()) {
            for (CreateSeatZonesRequest.SeatPosition pos : cfg.getCustomSeats()) {
                String rowLabel = rowLabel(pos.getRow());
                // Để hiển thị trên lưới đúng tọa độ, chúng ta có thể lưu thêm thuộc tính tọa độ.
                // Tuy nhiên hiện tại EventSeat chỉ có rowLabel và seatNumber.
                // Ta gán rowLabel = ký tự của row, seatNumber = col.
                seats.add(EventSeat.builder()
                        .event(event)
                        .zone(zone)
                        .rowLabel(rowLabel)
                        .seatNumber(pos.getCol())
                        .status(SeatStatus.AVAILABLE)
                        .build());
            }
        } else {
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

    private void cancelOrdersRefundAndReleaseSeats(Event event) {
        Long eventId = event.getId();
        List<Order> orders = orderRepository.findByEventId(eventId);
        List<Ticket> ticketsToDelete = new ArrayList<>();

        for (Order order : orders) {
            OrderStatus oldStatus = order.getStatus();
            if (oldStatus == OrderStatus.CANCELLED || oldStatus == OrderStatus.EXPIRED) {
                continue;
            }

            boolean wasPaid = oldStatus == OrderStatus.PAID;
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);

            SeatHold hold = order.getHold();
            if (hold != null && hold.getStatus() == HoldStatus.ACTIVE) {
                hold.setStatus(HoldStatus.RELEASED);
                hold.setReleasedAt(java.time.Instant.now());
                seatHoldRepository.save(hold);
            }

            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (item.getTicket() != null) {
                        ticketsToDelete.add(item.getTicket());
                        item.setTicket(null);
                    }
                }
            }

            String customerMessage = wasPaid
                    ? "Xin lỗi, sự kiện \"" + event.getName() + "\" đã bị hủy. Đơn "
                            + "đặt " + describeSeats(order) + " đã được hủy. Hệ thống đã ghi nhận hoàn tiền "
                            + order.getTotalAmount().toPlainString() + " VND cho bạn và vé liên quan đã được xóa."
                    : "Xin lỗi, sự kiện \"" + event.getName() + "\" đã bị hủy. Đơn "
                            + "đặt " + describeSeats(order) + " đã được hủy và ghế đã được trả lại.";

            notificationService.createForUser(
                    order.getUser(),
                    NotificationType.EVENT_CANCELLED_REFUND,
                    "Sự kiện bị hủy",
                    customerMessage,
                    "/my-tickets",
                    eventId,
                    order.getId());

            notificationService.createForAdmins(
                    NotificationType.ORDER_CANCELLED,
                    "Đơn hàng đã bị hủy",
                    "Đơn " + order.getOrderCode() + " đã bị hủy do sự kiện \"" + event.getName() + "\" bị hủy.",
                    "/admin/orders",
                    eventId,
                    order.getId());

            seatBroadcastService.broadcastOrderStatusChanged(
                    OrderUpdateMessage.builder()
                            .type("ORDER_CANCELLED")
                            .orderId(order.getId())
                            .orderCode(order.getOrderCode())
                            .eventId(eventId)
                            .eventName(event.getName())
                            .status(OrderStatus.CANCELLED.name())
                            .totalAmount(order.getTotalAmount())
                            .customerName(order.getUser() != null ? order.getUser().getFullName() : null)
                            .customerEmail(order.getUser() != null ? order.getUser().getEmail() : null)
                            .ticketCount(order.getItems() != null ? order.getItems().size() : 0)
                            .build());
        }

        if (!ticketsToDelete.isEmpty()) {
            ticketRepository.deleteAll(ticketsToDelete);
        }

        List<Long> releasedSeatIds = new ArrayList<>();
        for (EventSeat seat : eventSeatRepository.findByEventId(eventId)) {
            if (seat.getStatus() != SeatStatus.AVAILABLE || seat.getHeldBy() != null || seat.getHeldUntil() != null) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setHeldBy(null);
                seat.setHeldUntil(null);
                seat.setPriceAtSale(null);
                eventSeatRepository.save(seat);
                releasedSeatIds.add(seat.getId());
            }
        }

        if (!releasedSeatIds.isEmpty()) {
            seatBroadcastService.broadcastMultipleSeatsAvailable(eventId, releasedSeatIds);
        }
    }

    private String describeSeats(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return "ghế đã chọn";
        }

        List<String> seats = order.getItems().stream()
                .map(item -> item.getRowLabel() + item.getSeatNumber())
                .toList();
        return (seats.size() == 1 ? "ghế " : "các ghế ") + String.join(", ", seats);
    }

    private void broadcastDashboardStats(Long eventId) {
        try {
            long sold = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.SOLD);
            long locked = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.LOCKED);
            long available = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
            long total = sold + locked + available;
            double fillRate = total == 0 ? 0.0 : BigDecimal.valueOf((double) sold / total * 100)
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();

            BigDecimal revenue = orderRepository.sumRevenueByEventId(eventId, OrderStatus.PAID);
            long pending = orderRepository.searchOrdersByStatus("", OrderStatus.PENDING, Pageable.unpaged())
                    .getTotalElements();

            seatBroadcastService.broadcastDashboardUpdate(
                    DashboardUpdateMessage.builder()
                            .eventId(eventId)
                            .soldSeats(sold)
                            .lockedSeats(locked)
                            .availableSeats(available)
                            .totalSeats(total)
                            .fillRate(fillRate)
                            .totalRevenue(revenue)
                            .pendingOrders(pending)
                            .build());
        } catch (Exception ignored) {
            // Dashboard push is best-effort; REST reads remain authoritative.
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
                .locationUrl(e.getLocationUrl())
                .status(e.getStatus()).createdAt(e.getCreatedAt())
                .totalSeats(total).availableSeats(available).soldSeats(sold)
                .priceFrom(priceFrom)
                .build();
    }

    private EventResponse toDetailResponse(Event e) {
        List<EventResponse.ZoneSummary> zones = seatZoneRepository.findByEventId(e.getId()).stream()
                .map(z -> {
                    long total     = eventSeatRepository.countByEventIdAndZoneId(e.getId(), z.getId());
                    long available = eventSeatRepository.countByEventIdAndZoneIdAndStatus(
                            e.getId(), z.getId(), SeatStatus.AVAILABLE);
                    long sold      = eventSeatRepository.countByEventIdAndZoneIdAndStatus(
                            e.getId(), z.getId(), SeatStatus.SOLD);
                    return EventResponse.ZoneSummary.from(z, total, available, sold);
                })
                .toList();

        return EventResponse.builder()
                .id(e.getId()).name(e.getName()).description(e.getDescription())
                .venue(e.getVenue()).eventDate(e.getEventDate()).imageUrl(e.getImageUrl())
                .locationUrl(e.getLocationUrl())
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
                .imageUrl(e.getImageUrl()).locationUrl(e.getLocationUrl())
                .totalSeats(sold + locked + avail).soldSeats(sold)
                .lockedSeats(locked).availableSeats(avail)
                .build();
    }
}
