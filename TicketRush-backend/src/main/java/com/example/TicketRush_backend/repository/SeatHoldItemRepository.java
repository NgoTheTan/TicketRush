package com.example.TicketRush_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.TicketRush_backend.entity.SeatHoldItem;

public interface SeatHoldItemRepository extends JpaRepository<SeatHoldItem, Long> {

    /**
     * Tìm hold item theo holdId + seatId để release ghế cụ thể.
     */
    Optional<SeatHoldItem> findByHoldIdAndSeatId(Long holdId, Long seatId);

    /**
     * Lấy danh sách ghế còn lại trong hold, dùng để build response sau hold/release.
     */
    List<SeatHoldItem> findByHoldIdOrderBySeatIdAsc(Long holdId);

    /**
     * Đếm số ghế còn lại trong hold.
     */
    int countByHoldId(Long holdId);
}