package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.mail.TicketEmailMessage;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class EmailService {

    private static final String PASSWORD_RESET_SUBJECT = "Mã OTP đặt lại mật khẩu TicketRush";
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(VIETNAM_ZONE);
    private static final Locale VIETNAM_LOCALE = Locale.forLanguageTag("vi-VN");

    @Value("${app.mail.from:TicketRush <onboarding@resend.dev>}")
    private String fromAddress;

    @Value("${app.mail.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.mail.resend.base-url:https://api.resend.com}")
    private String resendBaseUrl;

    public void sendPasswordResetOtp(String email, String otp, int ttlMinutes) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("No Resend API key configured. Password reset OTP for {} is {}", email, otp);
            return;
        }

        try {
            ResendEmailResponse response = sendEmail(
                    email,
                    PASSWORD_RESET_SUBJECT,
                    buildPasswordResetHtml(otp, ttlMinutes),
                    buildPasswordResetText(otp, ttlMinutes),
                    List.of());

            log.info("Sent password reset OTP to {} via Resend email id {}", email,
                    response != null ? response.id() : "unknown");
        } catch (RestClientResponseException ex) {
            log.error("Resend rejected password reset OTP email to {} with status {}: {}",
                    email, ex.getStatusCode(), ex.getResponseBodyAsString(), ex);
            throw new AppException(ErrorCode.SERVICE_UNAVAILABLE,
                    Map.of("message", "Không thể gửi email OTP lúc này, vui lòng thử lại sau"));
        } catch (Exception ex) {
            log.error("Failed to send password reset OTP to {}", email, ex);
            throw new AppException(ErrorCode.SERVICE_UNAVAILABLE,
                    Map.of("message", "Không thể gửi email OTP lúc này, vui lòng thử lại sau"));
        }
    }

    public void sendTicketQrEmail(TicketEmailMessage message) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("No Resend API key configured. Skipping ticket QR email for order {}", message.orderCode());
            return;
        }
        if (message.recipientEmail() == null || message.recipientEmail().isBlank()) {
            log.warn("No recipient email available. Skipping ticket QR email for order {}", message.orderCode());
            return;
        }
        if (message.tickets() == null || message.tickets().isEmpty()) {
            log.warn("No tickets available. Skipping ticket QR email for order {}", message.orderCode());
            return;
        }

        try {
            List<ResendAttachment> attachments = message.tickets().stream()
                    .map(ticket -> new ResendAttachment(
                            buildQrFilename(ticket),
                            generateQrPngBase64(ticket.ticketCode()),
                            "image/png"))
                    .toList();

            ResendEmailResponse response = sendEmail(
                    message.recipientEmail(),
                    "Vé điện tử TicketRush - " + message.eventName(),
                    buildTicketEmailHtml(message),
                    buildTicketEmailText(message),
                    attachments);

            log.info("Sent ticket QR email for order {} to {} via Resend email id {}",
                    message.orderCode(), message.recipientEmail(),
                    response != null ? response.id() : "unknown");
        } catch (Exception ex) {
            log.error("Failed to send ticket QR email for order {} to {}",
                    message.orderCode(), message.recipientEmail(), ex);
            throw new AppException(ErrorCode.SERVICE_UNAVAILABLE,
                    Map.of("message", "Không thể gửi email vé lúc này"));
        }
    }

    private ResendEmailResponse sendEmail(String to, String subject, String html, String text,
                                          List<ResendAttachment> attachments) {
        return RestClient.builder()
                .baseUrl(resendBaseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + resendApiKey)
                .build()
                .post()
                .uri("/emails")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ResendEmailRequest(fromAddress, to, subject, html, text, attachments))
                .retrieve()
                .body(ResendEmailResponse.class);
    }

    private String buildPasswordResetText(String otp, int ttlMinutes) {
        return """
                Xin chào,

                Mã OTP đặt lại mật khẩu TicketRush của bạn là: %s

                Mã này có hiệu lực trong %d phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

                TicketRush
                """.formatted(otp, ttlMinutes);
    }

    private String buildPasswordResetHtml(String otp, int ttlMinutes) {
        return """
                <p>Xin chào,</p>
                <p>Mã OTP đặt lại mật khẩu TicketRush của bạn là:</p>
                <p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:16px 0;">%s</p>
                <p>Mã này có hiệu lực trong %d phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <p>TicketRush</p>
                """.formatted(otp, ttlMinutes);
    }

    private String buildTicketEmailText(TicketEmailMessage message) {
        StringBuilder text = new StringBuilder();
        text.append("Xin chào ").append(defaultText(message.customerName(), "bạn")).append(",\n\n")
                .append("Cảm ơn bạn đã đặt vé tại TicketRush.\n\n")
                .append("Mã đơn hàng: ").append(message.orderCode()).append('\n')
                .append("Sự kiện: ").append(message.eventName()).append('\n')
                .append("Địa điểm: ").append(message.venue()).append('\n')
                .append("Thời gian: ").append(formatInstant(message.eventDate())).append('\n')
                .append("Tổng tiền: ").append(formatMoney(message.totalAmount())).append("\n\n")
                .append("Danh sách vé:\n");

        for (TicketEmailMessage.TicketInfo ticket : message.tickets()) {
            text.append("- Vé ").append(ticket.ticketCode())
                    .append(" | Khu ").append(ticket.zoneName())
                    .append(", hàng ").append(ticket.rowLabel())
                    .append(", ghế ").append(ticket.seatNumber())
                    .append(" | ").append(formatMoney(ticket.price()))
                    .append('\n');
        }

        text.append("\nMã QR vào cổng được đính kèm trong email này dưới dạng file PNG.\n")
                .append("Vui lòng xuất trình mã QR khi vào sự kiện.\n\n")
                .append("TicketRush");
        return text.toString();
    }

    private String buildTicketEmailHtml(TicketEmailMessage message) {
        StringBuilder rows = new StringBuilder();
        for (TicketEmailMessage.TicketInfo ticket : message.tickets()) {
            rows.append("""
                    <tr>
                      <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-family:monospace;">%s</td>
                      <td style="padding:10px;border-bottom:1px solid #e2e8f0;">%s</td>
                      <td style="padding:10px;border-bottom:1px solid #e2e8f0;">Hàng %s, ghế %s</td>
                      <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">%s</td>
                    </tr>
                    """.formatted(
                    escapeHtml(ticket.ticketCode()),
                    escapeHtml(ticket.zoneName()),
                    escapeHtml(ticket.rowLabel()),
                    ticket.seatNumber(),
                    escapeHtml(formatMoney(ticket.price()))));
        }

        return """
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
                  <h2 style="margin:0 0 12px;color:#4f46e5;">Vé điện tử TicketRush</h2>
                  <p>Xin chào %s,</p>
                  <p>Cảm ơn bạn đã đặt vé tại TicketRush. Mã QR vào cổng được đính kèm trong email này dưới dạng file PNG.</p>
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:16px 0;">
                    <p style="margin:0;"><strong>Mã đơn hàng:</strong> %s</p>
                    <p style="margin:6px 0 0;"><strong>Sự kiện:</strong> %s</p>
                    <p style="margin:6px 0 0;"><strong>Địa điểm:</strong> %s</p>
                    <p style="margin:6px 0 0;"><strong>Thời gian:</strong> %s</p>
                    <p style="margin:6px 0 0;"><strong>Tổng tiền:</strong> %s</p>
                  </div>
                  <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                    <thead>
                      <tr style="background:#eef2ff;color:#312e81;">
                        <th align="left" style="padding:10px;">Mã vé</th>
                        <th align="left" style="padding:10px;">Khu vực</th>
                        <th align="left" style="padding:10px;">Ghế</th>
                        <th align="right" style="padding:10px;">Giá</th>
                      </tr>
                    </thead>
                    <tbody>%s</tbody>
                  </table>
                  <p style="margin-top:16px;">Vui lòng xuất trình file QR tương ứng với từng vé khi vào sự kiện.</p>
                  <p style="color:#64748b;font-size:13px;">TicketRush</p>
                </div>
                """.formatted(
                escapeHtml(defaultText(message.customerName(), "bạn")),
                escapeHtml(message.orderCode()),
                escapeHtml(message.eventName()),
                escapeHtml(message.venue()),
                escapeHtml(formatInstant(message.eventDate())),
                escapeHtml(formatMoney(message.totalAmount())),
                rows);
    }

    private String generateQrPngBase64(String value) {
        try {
            BitMatrix matrix = new MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, 320, 320);
            BufferedImage image = new BufferedImage(matrix.getWidth(), matrix.getHeight(), BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < matrix.getWidth(); x++) {
                for (int y = 0; y < matrix.getHeight(); y++) {
                    image.setRGB(x, y, matrix.get(x, y) ? 0xFF111827 : 0xFFFFFFFF);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception ex) {
            throw new IllegalStateException("Could not generate ticket QR image", ex);
        }
    }

    private String buildQrFilename(TicketEmailMessage.TicketInfo ticket) {
        String code = ticket.ticketCode() == null ? "ticket" : ticket.ticketCode();
        String shortCode = code.length() > 8 ? code.substring(0, 8) : code;
        return "TicketRush-" + shortCode + ".png";
    }

    private String formatInstant(Instant instant) {
        return instant == null ? "" : DATE_TIME_FORMATTER.format(instant);
    }

    private String formatMoney(BigDecimal amount) {
        return amount == null ? "" : NumberFormat.getCurrencyInstance(VIETNAM_LOCALE).format(amount);
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private record ResendEmailRequest(String from, String to, String subject, String html, String text,
                                      List<ResendAttachment> attachments) {
    }

    private record ResendAttachment(String filename, String content, String content_type) {
    }

    private record ResendEmailResponse(String id) {
    }
}
