import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Link } from 'wouter';

function FinalCTASection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-20 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-12 relative overflow-hidden bg-white text-landing-on-primary transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#8b0000] to-landing-primary"></div>
      <div className="max-w-4xl mx-auto text-left relative z-10">
        <h2 className="font-sf-pro-display text-3xl sm:text-4xl lg:text-5xl md:text-7xl mb-8 sm:mb-10 tracking-tight text-left">Enter: Global Circle</h2>
        <p className="font-sf-pro-text text-lg sm:text-xl text-landing-on-primary-container mb-12 sm:mb-16 leading-relaxed text-left">Applications for {new Date().getFullYear()} Fellowship cohort are now being reviewed. Secure your place among the leaders of international law.</p>
        <Link href="/register">
          <button className="bg-white text-landing-primary px-8 sm:px-12 lg:px-14 py-4 sm:py-6 rounded-DEFAULT font-sf-pro-text uppercase tracking-[0.3em] text-sm hover:bg-gray-100 transition-all shadow-xl active:scale-95">
            Begin Your Ascension
          </button>
        </Link>
      </div>
      {/* Accent lines */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-landing-on-primary"></div>
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-landing-on-primary"></div>
      </div> 
    </section>
  );
}

export default FinalCTASection;
