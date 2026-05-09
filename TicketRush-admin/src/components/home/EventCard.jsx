function EventCard({ event }) {
  return (
    <div className="flex flex-col bg-white rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 group">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={event.image} alt={event.title} />
        <div className="absolute top-4 left-4">
          <span className={`${event.statusClass} backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
            {event.status}
          </span>
        </div>
        {event.showFavorite && (
          <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-full text-on-background shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined" data-icon="favorite" data-weight="fill">favorite</span>
          </button>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <p className="text-indigo-600 font-bold text-xs uppercase mb-2">{event.category}</p>
        <h3 className="font-h3 text-xl mb-4 line-clamp-2">{event.title}</h3>
        <div className="space-y-3 mb-6 flex-1">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-lg opacity-60">calendar_today</span>
            <span className="text-body-sm">{event.date}</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-lg opacity-60">location_on</span>
            <span className="text-body-sm line-clamp-1">{event.location}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Giá từ</span>
            <span className="text-lg font-black text-on-background">{event.price}</span>
          </div>
          <button className={`${event.buttonClass} px-4 py-2 rounded font-bold text-sm transition-colors`}>
            {event.button}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
