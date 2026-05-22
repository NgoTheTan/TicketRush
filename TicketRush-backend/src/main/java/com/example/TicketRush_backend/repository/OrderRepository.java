package com.example.TicketRush_backend.repository;

import java.math.BigDecimal;
import java.time.Instant;
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

    boolean existsByEventIdAndStatus(Long eventId, OrderStatus status);

    Page<Order> findByUserId(Long userId, Pageable pageable);

    Optional<Order> findByIdAndUserId(Long id, Long userId);

    Optional<Order> findByHoldId(Long holdId);

    List<Order> findByEventId(Long eventId);

    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.event.id = :eventId")
    Page<Order> findByStatusAndEventId(@Param("status") OrderStatus status,
                                       @Param("eventId") Long eventId,
                                       Pageable pageable);

    // ── Admin: Order management filters ───────────────────────
    //
    // Không dùng query kiểu:
    //   (:status IS NULL OR o.status = :status)
    //   (:eventId IS NULL OR o.event.id = :eventId)
    //
    // Lý do: PostgreSQL/JDBC có thể không suy luận được kiểu dữ liệu
    // của parameter null trong biểu thức "? IS NULL", gây lỗi:
    //   ERROR: could not determine data type of parameter
    //
    // Vì vậy tách query theo 4 trường hợp:
    //   1. chỉ search
    //   2. search + status
    //   3. search + event
    //   4. search + status + event
    //
    // keyword luôn được OrderService chuẩn hóa null -> "".
    // LIKE '%%' tương đương không lọc theo keyword.

    @Query("""
        SELECT o FROM Order o
        JOIN o.user u
        WHERE (
            LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(o.event.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        ORDER BY o.createdAt DESC
    """)
    Page<Order> searchOrders(
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        SELECT o FROM Order o
        JOIN o.user u
        WHERE (
            LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(o.event.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        AND o.status = :status
        ORDER BY o.createdAt DESC
    """)
    Page<Order> searchOrdersByStatus(
            @Param("keyword") String keyword,
            @Param("status") OrderStatus status,
            Pageable pageable
    );

    @Query("""
        SELECT o FROM Order o
        JOIN o.user u
        WHERE (
            LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(o.event.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        AND o.event.id = :eventId
        ORDER BY o.createdAt DESC
    """)
    Page<Order> searchOrdersByEvent(
            @Param("keyword") String keyword,
            @Param("eventId") Long eventId,
            Pageable pageable
    );

    @Query("""
        SELECT o FROM Order o
        JOIN o.user u
        WHERE (
            LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(o.event.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        AND o.status = :status
        AND o.event.id = :eventId
        ORDER BY o.createdAt DESC
    """)
    Page<Order> searchOrdersByStatusAndEvent(
            @Param("keyword") String keyword,
            @Param("status") OrderStatus status,
            @Param("eventId") Long eventId,
            Pageable pageable
    );

    // ── Sprint 4: Dashboard analytics ─────────────────────────

    /** Tổng doanh thu cho event, chỉ tính PAID. */
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
     * Doanh thu theo giờ cho một event.
     * Trả về Object[]{hour, revenue, ticketCount}.
     */
    @Query(value = """
        SELECT DATE_TRUNC('hour', o.paid_at) AS hour,
               SUM(o.total_amount)          AS revenue,
               CAST(SUM((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)) AS bigint) AS ticket_count
        FROM orders o
        WHERE o.event_id = :eventId
          AND o.status   = CAST('PAID' AS order_status)
          AND o.paid_at IS NOT NULL
        GROUP BY DATE_TRUNC('hour', o.paid_at)
        ORDER BY hour
    """, nativeQuery = true)
    List<Object[]> findRevenueByHour(@Param("eventId") Long eventId);

    /**
     * Đơn hàng gần nhất của event, PAID only.
     */
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

    /**
     * Tìm các Order PENDING có expiresAt trước thời điểm now.
     * Dùng bởi SeatReleaseScheduler để expire order khi hold hết hạn.
     */
    @Query("""
        SELECT o FROM Order o
        WHERE o.status = :status
          AND o.expiresAt IS NOT NULL
          AND o.expiresAt < :now
    """)
    List<Order> findExpiredPendingOrders(@Param("status") OrderStatus status, @Param("now") Instant now);
}