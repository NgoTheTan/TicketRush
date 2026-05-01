package com.example.TicketRush_backend.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final Object meta;
    private final ErrorDetail error;

    // ── Success factories ──────────────────────────────────────

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().success(true).data(data).build();
    }

    public static <T> ApiResponse<T> ok(T data, Object meta) {
        return ApiResponse.<T>builder().success(true).data(data).meta(meta).build();
    }

    public static ApiResponse<Void> noContent() {
        return ApiResponse.<Void>builder().success(true).build();
    }

    // ── Error factory ──────────────────────────────────────────

    public static <T> ApiResponse<T> fail(ErrorCode code) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorDetail.of(code))
                .build();
    }

    public static <T> ApiResponse<T> fail(ErrorCode code, Object details) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorDetail.of(code, details))
                .build();
    }

    // ── Nested types ───────────────────────────────────────────

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorDetail {
        private final String code;
        private final String message;
        private final Object details;

        static ErrorDetail of(ErrorCode ec) {
            return ErrorDetail.builder().code(ec.getCode()).message(ec.getMessage()).build();
        }

        static ErrorDetail of(ErrorCode ec, Object details) {
            return ErrorDetail.builder().code(ec.getCode()).message(ec.getMessage()).details(details).build();
        }
    }

    @Getter
    @Builder
    public static class PageMeta {
        private final int page;
        private final int size;
        private final long totalElements;
        private final int totalPages;
        private final boolean hasNext;
        private final boolean hasPrevious;

        public static PageMeta of(org.springframework.data.domain.Page<?> p) {
            return PageMeta.builder()
                    .page(p.getNumber())
                    .size(p.getSize())
                    .totalElements(p.getTotalElements())
                    .totalPages(p.getTotalPages())
                    .hasNext(p.hasNext())
                    .hasPrevious(p.hasPrevious())
                    .build();
        }
    }
}
