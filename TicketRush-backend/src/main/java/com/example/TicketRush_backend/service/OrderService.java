package com.example.TicketRush_backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.checkout.CheckoutResponse;
import com.example.TicketRush_backend.dto.mail.TicketEmailMessage;
import com.example.TicketRush_backend.dto.order.OrderResponse;
import com.example.TicketRush_backend.dto.ws.DashboardUpdateMessage;
import com.example.TicketRush_backend.dto.ws.OrderUpdateMessage;
import com.example.TicketRush_backend.entity.CustomerProfile;
import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.entity.OrderItem;
import com.example.TicketRush_backend.entity.SeatHold;
import com.example.TicketRush_backend.entity.SeatHoldItem;
import com.example.TicketRush_backend.entity.Ticket;
import com.example.TicketRush_backend.enums.HoldStatus;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.enums.TicketStatus;
import com.example.TicketRush_backend.repository.CustomerProfileRepository;
import com.example.TicketRush_backend.repository.EventSeatRepository;
import com.example.TicketRush_backend.repository.OrderRepository;
import com.example.TicketRush_backend.repository.SeatHoldRepository;
import com.example.TicketRush_backend.repository.TicketRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final EventSeatRepository eventSeatRepository;
    private final TicketRepository ticketRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final SeatBroadcastService seatBroadcastService;
    private final EmailService emailService;

    // ── Customer: Create Order from Hold ──────────────────────

    @Transactional
    public OrderResponse createOrder(Long holdId, Long userId) {
        SeatHold hold = findActiveHoldForUser(holdId, userId);

        // Idempotency: nếu đã có order cho hold này
        orderRepository.findByHoldId(holdId).ifPresent(existing -> {
            throw new AppException(ErrorCode.ORDER_ALREADY_PAID,
                    Map.of("existingOrderId", existing.getId()));
        });

        BigDecimal total = hold.getItems().stream()
                .map(SeatHoldItem::getPriceSnapshot)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String dateStr = DateTimeFormatter.ofPattern("yyyyMMdd")
                .withZone(ZoneOffset.UTC).format(Instant.now());

        Order order = Order.builder()
                .orderCode("TKR-" + dateStr + "-TEMP")
                .user(hold.getUser())
                .event(hold.getEvent())
                .hold(hold)
                .status(OrderStatus.PENDING)
                .totalAmount(total)
                .expiresAt(hold.getExpiresAt())
                .build();

        order = orderRepository.save(order);
        order.setOrderCode("TKR-" + dateStr + "-" + String.format("%04d", order.getId()));

        List<OrderItem> items = new ArrayList<>();
        for (SeatHoldItem holdItem : hold.getItems()) {
            EventSeat seat = holdItem.getSeat();
            items.add(OrderItem.builder()
                    .order(order)
                    .seat(seat)
                    .zoneName(seat.getZone().getName())
                    .rowLabel(seat.getRowLabel())
                    .seatNumber(seat.getSeatNumber())
                    .unitPrice(holdItem.getPriceSnapshot())
                    .build());
        }
        order.setItems(items);
        order = orderRepository.save(order);

        OrderResponse response = buildOrderResponse(order);

        // Broadcast tới admin: đơn hàng mới PENDING
        broadcastOrderUpdate("ORDER_CREATED", order);
        // Broadcast dashboard stats update
        broadcastDashboardStats(order.getEvent().getId());

        return response;
    }

    // ── Customer: Confirm Checkout ─────────────────────────────

    /**
     * Xác nhận thanh toán giả lập. Chạy trong một DB transaction.
     * Theo đúng checklist §5.2 trong API_Contract.md:
     *   1. hold owned by user
     *   2. hold.status == ACTIVE
     *   3. hold.expires_at > NOW()
     *   4. Mỗi seat: SELECT FOR UPDATE → verify LOCKED + held_by == userId
     *   5. EventSeat: LOCKED → SOLD
     *   6. Order: PENDING → PAID
     *   7. Tạo Ticket cho mỗi OrderItem
     *   8. SeatHold: ACTIVE → CONVERTED
     */
    @Transactional
    public CheckoutResponse confirmCheckout(Long holdId, Long userId) {
        SeatHold hold = findActiveHoldForUser(holdId, userId);

        Order order = orderRepository.findByHoldId(holdId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() == OrderStatus.PAID) {
            throw new AppException(ErrorCode.ORDER_ALREADY_PAID);
        }

        List<CheckoutResponse.TicketDetail> ticketDetails = new ArrayList<>();
        List<TicketEmailMessage.TicketInfo> ticketEmailItems = new ArrayList<>();

        for (OrderItem item : order.getItems()) {
            // SELECT FOR UPDATE trên từng ghế
            EventSeat seat = eventSeatRepository
                    .findByIdForUpdate(item.getSeat().getId())
                    .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));

            if (seat.getStatus() != SeatStatus.LOCKED
                    || seat.getHeldBy() == null
                    || !seat.getHeldBy().getId().equals(userId)) {
                throw new AppException(ErrorCode.HOLD_NOT_ACTIVE,
                        Map.of("seatId", seat.getId(), "reason", "seat no longer locked by you"));
            }

            seat.setStatus(SeatStatus.SOLD);
            seat.setPriceAtSale(item.getUnitPrice());
            eventSeatRepository.save(seat);

            Ticket ticket = Ticket.builder()
                    .orderItem(item)
                    .user(order.getUser())
                    .event(order.getEvent())
                    .seat(seat)
                    .status(TicketStatus.VALID)
                    .build();
            ticket = ticketRepository.save(ticket);

            ticketDetails.add(CheckoutResponse.TicketDetail.builder()
                    .ticketId(ticket.getId())
                    .ticketCode(ticket.getTicketCode().toString())
                    .zoneName(item.getZoneName())
                    .rowLabel(item.getRowLabel())
                    .seatNumber(item.getSeatNumber())
                    .status(ticket.getStatus().name())
                    .issuedAt(ticket.getIssuedAt())
                    .build());
            ticketEmailItems.add(new TicketEmailMessage.TicketInfo(
                    ticket.getId(),
                    ticket.getTicketCode().toString(),
                    item.getZoneName(),
                    item.getRowLabel(),
                    item.getSeatNumber(),
                    item.getUnitPrice()));
        }

        Instant now = Instant.now();
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(now);
        orderRepository.save(order);

        hold.setStatus(HoldStatus.CONVERTED);
        hold.setConvertedAt(now);
        seatHoldRepository.save(hold);

        // Broadcast SEAT_SOLD for each seat — best effort, non-blocking
        Long eventId = order.getEvent().getId();
        for (OrderItem oi : order.getItems()) {
            seatBroadcastService.broadcastSeatSold(eventId, oi.getSeat().getId());
        }

        // Broadcast ORDER_PAID tới admin
        broadcastOrderUpdate("ORDER_PAID", order);
        // Broadcast dashboard stats update
        broadcastDashboardStats(eventId);

        sendTicketQrEmailAfterCommit(buildTicketEmailMessage(order, ticketEmailItems));

        return CheckoutResponse.builder()
                .order(CheckoutResponse.OrderDetail.builder()
                        .orderId(order.getId())
                        .orderCode(order.getOrderCode())
                        .status(order.getStatus().name())
                        .totalAmount(order.getTotalAmount())
                        .paidAt(order.getPaidAt())
                        .event(CheckoutResponse.EventSummary.builder()
                                .id(order.getEvent().getId())
                                .name(order.getEvent().getName())
                                .venue(order.getEvent().getVenue())
                                .eventDate(order.getEvent().getEventDate())
                                .build())
                        .build())
                .tickets(ticketDetails)
                .build();
    }

    // ── Customer: Cancel Order ─────────────────────────────────

    /**
     * Người dùng hủy đơn hàng (nhấn "Quay lại" không thanh toán).
     * Flow:
     *   1. Tìm order thuộc user, status PENDING
     *   2. Order → CANCELLED
     *   3. Hold → RELEASED
     *   4. Các ghế LOCKED → AVAILABLE
     *   5. Broadcast WS cho admin và user
     */
    @Transactional
    public void cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new AppException(ErrorCode.ORDER_ALREADY_PAID,
                    Map.of("currentStatus", order.getStatus()));
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        // Release hold
        SeatHold hold = order.getHold();
        if (hold != null && hold.getStatus() == HoldStatus.ACTIVE) {
            hold.setStatus(HoldStatus.RELEASED);
            hold.setReleasedAt(Instant.now());
            seatHoldRepository.save(hold);

            // Release từng ghế
            Long eventId = order.getEvent().getId();
            for (SeatHoldItem holdItem : hold.getItems()) {
                EventSeat seat = holdItem.getSeat();
                if (seat.getStatus() == SeatStatus.LOCKED) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldBy(null);
                    seat.setHeldUntil(null);
                    eventSeatRepository.save(seat);
                    seatBroadcastService.broadcastSeatAvailable(eventId, seat.getId());
                }
            }

            // Broadcast ORDER_CANCELLED tới admin
            broadcastOrderUpdate("ORDER_CANCELLED", order);
            // Broadcast dashboard stats
            broadcastDashboardStats(eventId);
        }
    }

    // ── Admin: Cancel or update order status ──────────────────

    /**
     * Admin có thể cập nhật trạng thái đơn hàng (ví dụ: hủy thủ công).
     */
    @Transactional
    public OrderResponse adminUpdateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);
        orderRepository.save(order);

        // Nếu cancel → release ghế
        if (newStatus == OrderStatus.CANCELLED && oldStatus == OrderStatus.PENDING) {
            SeatHold hold = order.getHold();
            if (hold != null && hold.getStatus() == HoldStatus.ACTIVE) {
                hold.setStatus(HoldStatus.RELEASED);
                hold.setReleasedAt(Instant.now());
                seatHoldRepository.save(hold);

                Long eventId = order.getEvent().getId();
                for (SeatHoldItem holdItem : hold.getItems()) {
                    EventSeat seat = holdItem.getSeat();
                    if (seat.getStatus() == SeatStatus.LOCKED) {
                        seat.setStatus(SeatStatus.AVAILABLE);
                        seat.setHeldBy(null);
                        seat.setHeldUntil(null);
                        eventSeatRepository.save(seat);
                        seatBroadcastService.broadcastSeatAvailable(eventId, seat.getId());
                    }
                }
            }
        }

        broadcastOrderUpdate("ORDER_" + newStatus.name(), order);
        broadcastDashboardStats(order.getEvent().getId());

        return buildOrderResponse(order);
    }

    // ── Customer: Get Order ────────────────────────────────────

    @Transactional(readOnly = true)
    public OrderResponse getOrderForUser(Long orderId, Long userId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        return buildOrderResponse(order);
    }

    // ── Admin ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
        public Page<OrderResponse> listOrders(String search, OrderStatus status,
                                      Long eventId, Pageable pageable) {
    /*
     * Không dùng query kiểu:
     *   (:status IS NULL OR o.status = :status)
     *   (:eventId IS NULL OR o.event.id = :eventId)
     *
     * Với PostgreSQL + prepared statement, các parameter null trong biểu thức
     * "? IS NULL" có thể gây lỗi:
     *   ERROR: could not determine data type of parameter
     *
     * Vì vậy tách query theo từng trường hợp có/không có status/eventId.
     */
    String safeSearch = search == null ? "" : search.trim();

    Page<Order> orders;

    if (status != null && eventId != null) {
        orders = orderRepository.searchOrdersByStatusAndEvent(
                safeSearch,
                status,
                eventId,
                pageable
        );
    } else if (status != null) {
        orders = orderRepository.searchOrdersByStatus(
                safeSearch,
                status,
                pageable
        );
    } else if (eventId != null) {
        orders = orderRepository.searchOrdersByEvent(
                safeSearch,
                eventId,
                pageable
        );
    } else {
        orders = orderRepository.searchOrders(
                safeSearch,
                pageable
        );
    }

    return orders.map(this::buildOrderResponse);
} // end of fix 

    @Transactional(readOnly = true)
    public OrderResponse getOrderAdmin(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        return buildOrderResponse(order);
    }

    // ── Helpers ───────────────────────────────────────────────

    private SeatHold findActiveHoldForUser(Long holdId, Long userId) {
        SeatHold hold = seatHoldRepository.findById(holdId)
                .orElseThrow(() -> new AppException(ErrorCode.HOLD_NOT_FOUND));

        if (!hold.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.HOLD_NOT_OWNED_BY_USER);
        }
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            throw new AppException(ErrorCode.HOLD_NOT_ACTIVE,
                    Map.of("holdStatus", hold.getStatus()));
        }
        if (hold.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.HOLD_EXPIRED,
                    Map.of("expiredAt", hold.getExpiresAt()));
        }
        return hold;
    }

    private OrderResponse buildOrderResponse(Order o) {
        List<OrderResponse.ItemDetail> items = o.getItems().stream()
                .map(item -> {
                    var b = OrderResponse.ItemDetail.builder()
                            .orderItemId(item.getId())
                            .zoneName(item.getZoneName())
                            .rowLabel(item.getRowLabel())
                            .seatNumber(item.getSeatNumber())
                            .unitPrice(item.getUnitPrice());
                    if (item.getTicket() != null) {
                        b.ticket(OrderResponse.TicketSummary.builder()
                                .ticketId(item.getTicket().getId())
                                .ticketCode(item.getTicket().getTicketCode().toString())
                                .status(item.getTicket().getStatus().name())
                                .build());
                    }
                    return b.build();
                })
                .toList();

        return OrderResponse.builder()
                .orderId(o.getId())
                .orderCode(o.getOrderCode())
                .status(o.getStatus())
                .totalAmount(o.getTotalAmount())
                .createdAt(o.getCreatedAt())
                .paidAt(o.getPaidAt())
                .expiresAt(o.getExpiresAt())
                .event(OrderResponse.EventSummary.builder()
                        .id(o.getEvent().getId())
                        .name(o.getEvent().getName())
                        .venue(o.getEvent().getVenue())
                        .eventDate(o.getEvent().getEventDate())
                        .imageUrl(o.getEvent().getImageUrl())
                        .build())
                .items(items)
                .customer(buildCustomerSummary(o))
                .build();
    }

    private OrderResponse.CustomerSummary buildCustomerSummary(Order o) {
        if (o.getUser() == null) return null;
        String phone = customerProfileRepository
                .findByUserId(o.getUser().getId())
                .map(CustomerProfile::getPhone)
                .orElse(null);
        return OrderResponse.CustomerSummary.builder()
                .fullName(o.getUser().getFullName())
                .email(o.getUser().getEmail())
                .phone(phone)
                .build();
    }

    private TicketEmailMessage buildTicketEmailMessage(Order order, List<TicketEmailMessage.TicketInfo> tickets) {
        return new TicketEmailMessage(
                order.getUser().getEmail(),
                order.getUser().getFullName(),
                order.getOrderCode(),
                order.getTotalAmount(),
                order.getEvent().getName(),
                order.getEvent().getVenue(),
                order.getEvent().getEventDate(),
                List.copyOf(tickets));
    }

    private void sendTicketQrEmailAfterCommit(TicketEmailMessage message) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendTicketQrEmailBestEffort(message);
                }
            });
            return;
        }

        sendTicketQrEmailBestEffort(message);
    }

    private void sendTicketQrEmailBestEffort(TicketEmailMessage message) {
        try {
            emailService.sendTicketQrEmail(message);
        } catch (RuntimeException | LinkageError ex) {
            log.warn("Ticket QR email failed for order {}. Checkout remains successful.",
                    message.orderCode(), ex);
        }
    }

    /**
     * Tính và broadcast dashboard stats sau khi có thay đổi order/seat.
     * Gọi sau khi transaction commit (được gọi từ trong @Transactional method,
     * STOMP là async nên an toàn).
     */
    private void broadcastDashboardStats(Long eventId) {
        try {
            long sold    = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.SOLD);
            long locked  = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.LOCKED);
            long avail   = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
            long total   = sold + locked + avail;
            double rate  = total == 0 ? 0.0 : roundRate((double) sold / total * 100);

            BigDecimal revenue = orderRepository.sumRevenueByEventId(eventId, OrderStatus.PAID);
            long pending = orderRepository.searchOrdersByStatus("", OrderStatus.PENDING,
                    org.springframework.data.domain.Pageable.unpaged()).getTotalElements();

            seatBroadcastService.broadcastDashboardUpdate(
                    DashboardUpdateMessage.builder()
                            .eventId(eventId)
                            .soldSeats(sold)
                            .lockedSeats(locked)
                            .availableSeats(avail)
                            .totalSeats(total)
                            .fillRate(rate)
                            .totalRevenue(revenue)
                            .pendingOrders(pending)
                            .build()
            );
        } catch (Exception e) {
            // Non-critical: nếu không broadcast được thì chỉ log
        }
    }

    private void broadcastOrderUpdate(String type, Order order) {
        try {
            seatBroadcastService.broadcastOrderCreated(
                    OrderUpdateMessage.builder()
                            .type(type)
                            .orderId(order.getId())
                            .orderCode(order.getOrderCode())
                            .eventId(order.getEvent().getId())
                            .eventName(order.getEvent().getName())
                            .status(order.getStatus().name())
                            .totalAmount(order.getTotalAmount())
                            .customerName(order.getUser() != null ? order.getUser().getFullName() : null)
                            .customerEmail(order.getUser() != null ? order.getUser().getEmail() : null)
                            .ticketCount(order.getItems() != null ? order.getItems().size() : 0)
                            .build()
            );
        } catch (Exception e) {
            // Non-critical: nếu không broadcast được thì chỉ log
        }
    }

    private double roundRate(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
