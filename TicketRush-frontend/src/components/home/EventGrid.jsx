import { exploreEvents } from '../../data/homepageData.js';
import EventCard from './EventCard.jsx';

function EventGrid() {
  return (
    <section className="px-6 lg:px-12 py-10 bg-slate-50/50 border-t border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <h2 className="font-h2 text-h2 text-on-background">Khám phá sự kiện</h2>
        <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-lg">
          <button className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">view_list</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {exploreEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      <div className="mt-20 flex justify-center">
        <button className="bg-white border-2 border-primary text-primary px-12 py-4 rounded-full font-bold hover:bg-primary hover:text-white transition-all duration-300">
          Xem thêm sự kiện
        </button>
      </div>
    </section>
  );
}

export default EventGrid;
