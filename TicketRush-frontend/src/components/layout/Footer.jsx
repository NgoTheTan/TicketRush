import { images } from '../../data/homepageData.js';

function FooterColumn({ title, links }) {
  return (
    <div>
      <h4 className="font-bold text-lg mb-6">{title}</h4>
      <ul className="space-y-4 text-slate-600">
        {links.map((link) => (
          <li key={link}>
            <a className="hover:text-primary transition-colors" href="#">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-20 pb-10">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
        <div>
          <a className="text-3xl font-black tracking-tighter text-indigo-600 mb-6 block" href="#">
            TicketRush
          </a>
          <p className="text-slate-500 mb-8 max-w-xs">
            Nền tảng đặt vé sự kiện hàng đầu Việt Nam, mang đến những trải nghiệm giải trí tuyệt vời nhất.
          </p>
          <div className="flex gap-4">
            {['social_leaderboard', 'camera', 'mail'].map((icon) => (
              <a
                key={icon}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-primary hover:text-white transition-all"
                href="#"
              >
                <span className="material-symbols-outlined">{icon}</span>
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title="Về TicketRush" links={['Về chúng tôi', 'Tin tức', 'Tuyển dụng', 'Liên hệ']} />
        <FooterColumn title="Chính sách" links={['Điều khoản sử dụng', 'Chính sách bảo mật', 'Chính sách hoàn tiền', 'Quy định bán vé']} />

        <div>
          <h4 className="font-bold text-lg mb-6">Tải ứng dụng</h4>
          <p className="text-slate-500 mb-6">Trải nghiệm đặt vé mượt mà trên điện thoại.</p>
          <div className="space-y-3">
            <button className="bg-on-background text-white w-full px-6 py-3 rounded-lg flex items-center gap-3 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined">phone_iphone</span>
              <div className="text-left">
                <div className="text-[10px] uppercase opacity-70 leading-none">Download on</div>
                <div className="text-sm font-bold leading-none">App Store</div>
              </div>
            </button>
            <button className="bg-on-background text-white w-full px-6 py-3 rounded-lg flex items-center gap-3 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined">android</span>
              <div className="text-left">
                <div className="text-[10px] uppercase opacity-70 leading-none">Get it on</div>
                <div className="text-sm font-bold leading-none">Google Play</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-400 text-sm">© 2026 TicketRush. All rights reserved. Powered by Entertainment Group.</p>
        <div className="flex items-center gap-4">
          <img className="h-6 grayscale opacity-50" src={images.visa} alt="Visa logo" />
          <img className="h-6 grayscale opacity-50" src={images.mastercard} alt="Mastercard logo" />
          <img className="h-6 grayscale opacity-50" src={images.momo} alt="Momo e-wallet logo" />
        </div>
      </div>
    </footer>
  );
}

export default Footer;
