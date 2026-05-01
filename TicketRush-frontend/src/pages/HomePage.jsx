import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import HeroSection from '../components/home/HeroSection.jsx';
import SearchFilters from '../components/home/SearchFilters.jsx';
import FeaturedEvents from '../components/home/FeaturedEvents.jsx';
import EventGrid from '../components/home/EventGrid.jsx';
import Newsletter from '../components/home/Newsletter.jsx';

function HomePage() {
  return (
    <>
      <Header />
      <main className="max-w-screen-2xl mx-auto">
        <HeroSection />
        <SearchFilters />
        <FeaturedEvents />
        <EventGrid />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}

export default HomePage;
