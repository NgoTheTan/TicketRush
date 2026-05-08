package com.example.TicketRush_backend.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.enums.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(Long userId, Pageable pageable);

    Optional<Order> findByIdAndUserId(Long id, Long userId);

    Optional<Order> findByHoldId(Long holdId);

    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.event.id = :eventId")
    Page<Order> findByStatusAndEventId(@Param("status") OrderStatus status,
                                       @Param("eventId") Long eventId,
                                       Pageable pageable);

    @Query("""
        SELECT o FROM Order o
        WHERE (:search IS NULL OR CAST(o.orderCode AS string) LIKE CONCAT('%', :search, '%'))
          AND (:status IS NULL OR o.status = :status)
          AND (:eventId IS NULL OR o.event.id = :eventId)
    """)
    Page<Order> findByFilters(@Param("search")  String search,
                              @Param("status")  OrderStatus status,
                              @Param("eventId") Long eventId,
                              Pageable pageable);

    // ── Sprint 4: Dashboard analytics ─────────────────────────

    /** Tổng doanh thu cho event (chỉ tính PAID — BR-07) */
    // @Query("""
    //     SELECT COALESCE(SUM(o.totalAmount), 0)
    //     FROM Order o
    //     WHERE o.event.id = :eventId AND o.status = 'PAID'
    // """)
    // BigDecimal sumRevenueByEventId(@Param("eventId") Long eventId);
    @Query("""
        SELECT COALESCE(SUM(o.totalAmount), 0)
        FROM Order o
        WHERE o.event.id = :eventId AND o.status = :status
    """)
    BigDecimal sumRevenueByEventId(
            @Param("eventId") Long eventId,
            @Param("status") OrderStatus status
    );


    /**
     * Doanh thu theo giờ (trunc to hour of paid_at) cho một event.
     * Trả về Object[]{hour (Instant), revenue (BigDecimal), ticketCount (Long)}
     */
    @Query(value = """
        SELECT DATE_TRUNC('hour', o.paid_at) AS hour,
               SUM(o.total_amount)          AS revenue,
               COUNT(*)                     AS ticket_count
        FROM orders o
        WHERE o.event_id = :eventId
          AND o.status   = CAST('PAID' AS order_status)
          AND o.paid_at IS NOT NULL
        GROUP BY DATE_TRUNC('hour', o.paid_at)
        ORDER BY hour
    """, nativeQuery = true)
    List<Object[]> findRevenueByHour(@Param("eventId") Long eventId);

    /**
     * Đơn hàng gần nhất của event (PAID only) — dùng cho recent orders section.
     */
    // @Query("""
    //     SELECT o FROM Order o
    //     WHERE o.event.id = :eventId AND o.status = 'PAID'
    //     ORDER BY o.paidAt DESC
    // """)
    // List<Order> findRecentPaidOrders(@Param("eventId") Long eventId, Pageable pageable);
    @Query("""
    SELECT o FROM Order o
    WHERE o.event.id = :eventId AND o.status = :status
    ORDER BY o.paidAt DESC
    """)
    List<Order> findRecentPaidOrders(
            @Param("eventId") Long eventId,
            @Param("status") OrderStatus status,
            Pageable pageable
    );
}
