import { countdown, images } from '../../data/homepageData.js';

function HeroSection() {
  return (
    <section className="relative px-6 lg:px-12 pt-8 pb-16">
      <div className="relative overflow-hidden rounded-xl h-[600px] flex items-center shadow-xl">
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src={images.hero}
          alt="Cinematic wide shot of a massive music festival stage at night with purple neon lights and a cheering crowd"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-on-background/90 via-on-background/40 to-transparent" />
        <div className="relative z-10 px-12 max-w-2xl text-white">
          <span className="inline-block bg-primary px-4 py-1 rounded-full text-label-caps mb-6 uppercase tracking-widest">
            Sự kiện tiêu biểu
          </span>
          <h1 className="font-h1 text-h1 mb-4 leading-tight">Summer Music Festival 2026</h1>
          <p className="text-body-lg font-body-lg mb-8 opacity-90">
            Lễ hội âm nhạc lớn nhất Đông Nam Á trở lại với dàn line-up huyền thoại. Sẵn sàng cho một mùa hè bùng nổ.
          </p>

          <div className="flex gap-4 mb-10">
            {countdown.map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center min-w-[80px]">
                <div className="font-tabular-nums text-2xl font-bold">{item.value}</div>
                <div className="text-[10px] uppercase opacity-70">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button className="bg-primary hover:bg-primary-container text-on-primary px-10 py-4 rounded-full font-bold text-lg flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/30">
              Mua vé ngay
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-10 py-4 rounded-full font-bold text-lg transition-all">
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
