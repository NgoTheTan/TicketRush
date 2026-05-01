package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.order.OrderResponse;
import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;

    // ── Customer ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OrderResponse getOrderForUser(Long orderId, Long userId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        return OrderResponse.from(order);
    }

    // ── Admin ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<OrderResponse> listOrders(String search, OrderStatus status,
                                          Long eventId, Pageable pageable) {
        return orderRepository.findByFilters(search, status, eventId, pageable)
                .map(OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderAdmin(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        return OrderResponse.from(order);
    }
}
