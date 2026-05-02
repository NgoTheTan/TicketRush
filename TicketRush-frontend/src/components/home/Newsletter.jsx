import { stats } from '../../data/homepageData.js';

function Newsletter() {
  return (
    <section className="px-6 lg:px-12 py-20">
      <div className="bg-indigo-900 rounded-[2rem] overflow-hidden relative p-12 lg:p-20 text-white flex flex-col lg:flex-row items-center gap-16">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-secondary/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />

        <div className="flex-1 relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">Đừng bỏ lỡ bất kỳ khoảnh khắc nào!</h2>
          <p className="text-xl text-indigo-100 opacity-80 mb-10 max-w-lg">
            Nhận thông báo sớm nhất về các sự kiện hot, ưu đãi độc quyền và mã giảm giá dành riêng cho bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <input
              className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nhập email của bạn"
              type="email"
            />
            <button className="bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-colors">Đăng ký ngay</button>
          </div>
        </div>

        <div className="lg:w-1/3 relative z-10 hidden lg:block">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className={`bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 text-center ${stat.offset ? 'translate-y-8' : ''}`}>
                <span className="material-symbols-outlined text-4xl text-indigo-300 mb-2">{stat.icon}</span>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-indigo-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Newsletter;
