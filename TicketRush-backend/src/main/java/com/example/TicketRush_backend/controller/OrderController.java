package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.checkout.CheckoutResponse;
import com.example.TicketRush_backend.dto.order.CreateOrderRequest;
import com.example.TicketRush_backend.dto.order.OrderResponse;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * GET /api/v1/orders/{orderId}
     * Lấy chi tiết một đơn hàng (BookingSuccess + lịch sử).
     * Access: CUSTOMER
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @PathVariable Long orderId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrderForUser(orderId, userId)));
    }

    /**
     * POST /api/v1/orders
     * Tạo Order từ SeatHold — chuyển từ SeatSelection → OrderConfirmation.
     * Body: { "holdId": 55 }
     * Access: CUSTOMER
     */
    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        OrderResponse response = orderService.createOrder(req.getHoldId(), userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * POST /api/v1/checkout/{holdId}/confirm
     * Xác nhận thanh toán giả lập.
     * Chuyển: Seat LOCKED→SOLD, Order PENDING→PAID, tạo Ticket QR.
     * Access: CUSTOMER
     */
    @PostMapping("/checkout/{holdId}/confirm")
    public ResponseEntity<ApiResponse<CheckoutResponse>> confirmCheckout(
            @PathVariable Long holdId) {
        Long userId = SecurityUtils.getCurrentUserId();
        CheckoutResponse response = orderService.confirmCheckout(holdId, userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
