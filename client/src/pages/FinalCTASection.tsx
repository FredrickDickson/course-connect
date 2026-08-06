import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Link } from 'wouter';
import { Star, ArrowRight } from 'lucide-react';

function FinalCTASection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`relative py-28 sm:py-36 lg:py-44 px-6 lg:px-12 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
    >
      {/* Background with Premium Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-landing-primary via-landing-primary-container to-[#8b0000]"></div>
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
        backgroundSize: '48px 48px'
      }}></div>
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-landing-secondary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      
      {/* Content Container */}
      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-10 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 animate-fade-in">
          <Star className="w-4 h-4 text-landing-secondary fill-landing-secondary" />
          <span className="font-sf-pro-text text-sm font-semibold tracking-wide text-white">
            Limited Enrollment
          </span>
        </div>
        
        {/* Main Heading */}
        <h2 className="font-sf-pro-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-white mb-10 tracking-tight leading-[1.08] font-bold animate-fade-in" style={{animationDelay: '0.1s'}}>
          Enter the Global Circle
        </h2>
        
        {/* Description */}
        <p className="font-sf-pro-text text-xl sm:text-2xl text-white/95 mb-14 leading-relaxed max-w-3xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
          Applications for {new Date().getFullYear()} Fellowship cohort are now being reviewed. Secure your place among the leaders of international law.
        </p>
        
        {/* CTA Button */}
        <div className="animate-fade-in" style={{animationDelay: '0.3s'}}>
          <Link href="/register">
            <button className="group relative bg-white text-landing-primary px-12 sm:px-16 lg:px-20 py-5 sm:py-6 rounded-2xl font-sf-pro-text font-bold text-base sm:text-lg uppercase tracking-[0.15em] hover:shadow-2xl hover:shadow-white/20 transition-all duration-500 hover:scale-105 active:scale-95 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-landing-surface to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center justify-center gap-3">
                Begin Your Ascension
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
          </Link>
        </div>
        
        {/* Trust Indicators */}
        <div className="mt-16 pt-12 border-t border-white/20 animate-fade-in" style={{animationDelay: '0.4s'}}>
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-sf-pro-display font-bold">4.9</div>
                <div className="text-sm font-sf-pro-text">Average Rating</div>
              </div>
            </div>
            
            <div className="h-12 w-[1px] bg-white/20 hidden sm:block"></div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-sf-pro-display font-bold">4,800+</div>
                <div className="text-sm font-sf-pro-text">Global Members</div>
              </div>
            </div>
            
            <div className="h-12 w-[1px] bg-white/20 hidden sm:block"></div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-sf-pro-display font-bold">38</div>
                <div className="text-sm font-sf-pro-text">Jurisdictions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Corner Accents */}
      <div className="absolute top-12 left-12 w-32 h-32 border-t-2 border-l-2 border-white/10 rounded-tl-3xl pointer-events-none hidden lg:block"></div>
      <div className="absolute bottom-12 right-12 w-32 h-32 border-b-2 border-r-2 border-white/10 rounded-br-3xl pointer-events-none hidden lg:block"></div>
    </section>
  );
}

export default FinalCTASection;
