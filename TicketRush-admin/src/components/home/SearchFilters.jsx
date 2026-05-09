function SearchFilters() {
  return (
    <section className="px-6 lg:px-12 -mt-16 relative z-20">
      <div className="bg-white rounded-xl shadow-[0px_10px_30px_rgba(0,0,0,0.08)] p-6 flex flex-col lg:flex-row gap-4 border border-slate-100">
        <div className="flex-1 flex items-center gap-3 bg-slate-50 px-4 py-4 rounded-lg border border-slate-200">
          <span className="material-symbols-outlined text-slate-400">search</span>
          <input className="bg-transparent border-none focus:ring-0 w-full font-body-md" placeholder="Tìm kiếm sự kiện, nghệ sĩ, địa điểm..." type="text" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:w-1/2">
          <FilterSelect icon="calendar_month" label="Thời gian" options={['Hôm nay', 'Cuối tuần này', 'Tháng này']} />
          <FilterSelect icon="location_on" label="Địa điểm" options={['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng']} />
          <FilterSelect icon="category" label="Thể loại" options={['Concert', 'Kịch nói', 'Workshop']} />
        </div>
        <button className="bg-on-background text-white px-10 py-4 rounded-lg font-bold hover:bg-slate-800 transition-colors">Tìm kiếm</button>
      </div>
    </section>
  );
}

function FilterSelect({ icon, label, options }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 px-4 py-4 rounded-lg border border-slate-200 cursor-pointer">
      <span className="material-symbols-outlined text-slate-400">{icon}</span>
      <select className="bg-transparent border-none focus:ring-0 w-full font-body-sm appearance-none">
        <option>{label}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

export default SearchFilters;
