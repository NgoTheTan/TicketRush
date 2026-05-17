// src/components/layout/Footer.jsx
function TicketMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-5 h-5 text-indigo-600 shrink-0"
      fill="currentColor"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v1.18a2.75 2.75 0 0 0 0 4.64v1.18A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-1.18a2.75 2.75 0 0 0 0-4.64V6.5Zm2 0v.93c.98.66 1.62 1.77 1.62 3.07s-.64 2.41-1.62 3.07v3.93h11V13.5c-.98-.66-1.62-1.77-1.62-3.07s.64-2.41 1.62-3.07V6.5h-11Zm4.25 4.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

function Footer() {
  return (
    // Xanh đậm hơi đen kiểu bầu trời đêm (giống Ticketbox footer reference)
    <footer style={{ background: '#0d1b3e' }} className="text-white">
      <div className="max-w-screen-2xl mx-auto px-8 py-10">
        {/* Logo + tên */}
        <div className="flex items-center gap-2 mb-3">
          <TicketMark />
          {/* Giảm còn 2/3 cỡ cũ: 2.35rem × 2/3 ≈ 1.57rem */}
          <span className="text-[1.57rem] font-black tracking-tighter leading-none text-indigo-600">TicketRush</span>
        </div>
        {/* Mô tả căn trái */}
        <p className="text-sm text-white/65 leading-relaxed max-w-md">
          Nền tảng quản lý và phân phối vé hàng đầu Việt Nam.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
