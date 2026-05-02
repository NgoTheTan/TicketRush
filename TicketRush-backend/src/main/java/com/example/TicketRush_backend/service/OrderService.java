package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.checkout.CheckoutResponse;
import com.example.TicketRush_backend.dto.order.OrderResponse;
import com.example.TicketRush_backend.entity.*;
import com.example.TicketRush_backend.enums.HoldStatus;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.enums.TicketStatus;
import com.example.TicketRush_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final EventSeatRepository eventSeatRepository;
    private final TicketRepository ticketRepository;

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

        return buildOrderResponse(order);
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
        }

        Instant now = Instant.now();
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(now);
        orderRepository.save(order);

        hold.setStatus(HoldStatus.CONVERTED);
        hold.setConvertedAt(now);
        seatHoldRepository.save(hold);

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
        return orderRepository.findByFilters(search, status, eventId, pageable)
                .map(this::buildOrderResponse);
    }

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
                .build();
    }
}
