function Header() {
  const links = ['Home', 'Events', 'My Tickets', 'Profile'];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 lg:px-12 h-20 w-full max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-12">
          <a className="text-2xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400" href="#">
            TicketRush
          </a>
          <nav className="hidden md:flex items-center gap-8 font-['Inter'] antialiased text-sm font-medium">
            {links.map((link, index) => (
              <a
                key={link}
                className={
                  index === 0
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 pb-5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-all duration-200'
                }
                href="#"
              >
                {link}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button className="hidden lg:flex items-center gap-2 text-slate-400 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined" data-icon="search">
              search
            </span>
            <span>Tìm sự kiện...</span>
          </button>
          <button className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold active:scale-95 transform transition-transform shadow-lg shadow-primary/20">
            Login
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
