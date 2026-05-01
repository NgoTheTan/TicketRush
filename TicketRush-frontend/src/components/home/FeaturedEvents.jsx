import { featuredEvents } from '../../data/homepageData.js';

function FeaturedEvents() {
  const { main, side } = featuredEvents;

  return (
    <section className="px-6 lg:px-12 py-20">
      <div className="flex justify-between items-end mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-label-caps uppercase block mb-2">Đề xuất cho bạn</span>
          <h2 className="font-h2 text-h2 text-on-background">Sự kiện nổi bật</h2>
        </div>
        <a className="text-primary font-bold flex items-center gap-2 hover:underline" href="#">
          Xem tất cả
          <span className="material-symbols-outlined">chevron_right</span>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[600px]">
        <div className="md:col-span-7 relative rounded-xl overflow-hidden group shadow-lg">
          <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={main.image} alt="Crowded concert venue with thousands of fans glowing under red stage lights and laser beams" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="absolute top-6 left-6 flex gap-2">
            <span className="bg-secondary text-on-secondary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{main.label}</span>
          </div>
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <p className="text-indigo-400 font-bold mb-2 uppercase tracking-widest text-xs">{main.category}</p>
            <h3 className="text-3xl font-bold mb-4">{main.title}</h3>
            <div className="flex flex-wrap gap-6 text-sm opacity-90">
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">calendar_today</span> {main.date}</span>
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">location_on</span> {main.location}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 grid grid-rows-2 gap-6">
          {side.map((event) => (
            <div key={event.title} className="relative rounded-xl overflow-hidden group shadow-lg">
              <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={event.image} alt={event.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="text-xl font-bold">{event.title}</h4>
                <p className="text-sm opacity-80">{event.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedEvents;
