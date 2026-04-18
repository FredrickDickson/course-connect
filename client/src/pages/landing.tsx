import { Link } from "wouter";
import { useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import cimaLogo from "@/assets/cima-logo.png";

export default function Landing() {
  useEffect(() => {
    // Inject fonts dynamically
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&family=Work+Sans:wght@400;500&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    
    const iconLink = document.createElement('link');
    iconLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
    iconLink.rel = 'stylesheet';
    document.head.appendChild(iconLink);

    return () => {
      // Optional cleanup
    };
  }, []);

  return (
    <div className="bg-landing-background text-landing-on-surface font-body selection:bg-[#ffdad4] selection:text-[#410000] min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <img 
                src={cimaLogo} 
                alt="CIMA Logo" 
                className="h-12 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-primary">CIMA Learn</h1>
                <p className="text-xs text-muted-foreground -mt-1">Professional ADR Education</p>
              </div>
            </Link>
            
            {/* Navigation - Mobile Only */}
            <div className="flex items-center space-x-4">
              {/* Removed Resources and Contact for mobile responsiveness */}
            </div>
            
            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <button className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Member Portal
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-landing-primary text-landing-on-primary px-4 py-2 text-sm font-medium hover:bg-landing-primary/90 transition-colors">
                  Enroll Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section: The Definitive Standard */}
        <section className="relative min-h-[600px] sm:min-h-[700px] lg:min-h-[921px] flex items-center px-4 sm:px-6 lg:px-12 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-12 items-center gap-6 lg:gap-12">
            <div className="col-span-12 md:col-span-6 z-10">
              <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-7xl leading-[1.1] text-landing-primary mb-6 sm:mb-8 tracking-tight">
                The Definitive Standard in <span className="italic">International Jurisdiction</span>
              </h1>
              <p className="font-body text-base sm:text-lg md:text-xl text-landing-on-surface-variant leading-relaxed max-w-lg mb-8 sm:mb-12">
                Join a global cadre of legal elite. Elevate your practice through rigorous ADR training and certifications recognized by the world's leading arbitral institutions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* <Link href="/qualification-pathway">
                  <button className="bg-landing-primary text-landing-on-primary px-10 py-5 rounded-DEFAULT font-label uppercase tracking-[0.2em] text-sm hover:bg-landing-primary-container transition-all">
                    Explore Pathways
                  </button>
                </Link> */}
                <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
                  <button className="bg-landing-primary text-landing-on-primary px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-DEFAULT font-label uppercase tracking-[0.2em] text-xs sm:text-sm hover:bg-landing-primary-container transition-all">
                    Explore Pathways
                  </button>
                </a>
                <Link href="/courses">
                  <button className="border border-landing-outline/20 text-landing-primary px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-DEFAULT font-label uppercase tracking-[0.2em] text-xs sm:text-sm hover:bg-landing-surface-container transition-all">
                    Browse Courses
                  </button>
                </Link>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] mt-8 md:mt-0">
              {/* <div className="absolute inset-0 bg-landing-surface-container-high rounded-lg overflow-hidden transform rotate-2 translate-x-4"></div> */}
              <img className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-2xl z-0 transform -rotate-2 transition-transform hover:rotate-0 duration-700" alt="ultra-modern international arbitration courtroom with mahogany paneling, circular bench, and glass accents in soft dramatic architectural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAniyrUTHdC71fW7ywKJUtxTZZko09EKrJDSMaW0C8HkY09fzWNAv_toRk2neLKvqnxp6y-GBQaGROj_4Nz-cFWYlrtfQj6YRBB40druRUyUt80KAAbclHld0z822peFM9ZCJbD6BkMtyuMlZDGBmhnINe0ZUXMYKos3_NPjrhmKyKcgbGXO9w9WYc79I7wstGWC3tihp7vK9JeSRGVFfr9ZwqYm8R3eqwMPzraVR4VJfL0tBIP9sG2I-zqCXrvHaz3N-NjJRIIc28" />
            </div>
          </div>
          {/* Decorative Elements */}
          {/* <div className="absolute top-1/4 -right-20 w-96 h-96 bg-landing-primary/5 rounded-full blur-[100px]"></div> */}
        </section>

        {/* Trust Signals: Logo Ticker */}
        <TrustSignalsSection />

        {/* Qualification Pathway: Ladder of Mastery */}
        <QualificationPathwaySection />

        {/* The CIMA Advantage: Unparalleled Pedigree */}
        <CIMAAdvantageSection />

        {/* Excellence Recognized (Testimonials) */}
        <TestimonialsSection />

        {/* Final Call to Action */}
        <FinalCTASection />
      </main>

      {/* Footer */}
      <footer className="bg-[#efeee3] dark:bg-stone-950 w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-12 border-t border-[#e3beb8]/15">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
          <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center space-x-3">
              <img 
                src={cimaLogo} 
                alt="CIMA Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-[#610000]">CIMA Learn</h1>
                <p className="text-xs text-[#5a403c]/70 -mt-1">Professional ADR Education</p>
              </div>
            </div>
            <p className="font-['Inter'] text-sm tracking-wide text-[#5a403c]/70 max-w-sm">
              Center for International Mediators and Arbitrators - Leading global alternative dispute resolution education and certification.
            </p>
            <p className="font-['Inter'] text-sm tracking-wide uppercase text-[#1b1c15]">© {new Date().getFullYear()} CIMA LEARN. All rights reserved.</p>
          </div>
          <div className="flex flex-col md:items-end justify-between">
            <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 font-['Inter'] text-sm tracking-wide uppercase">
              <Link href="/privacy-policy" className="text-[#5a403c]/70 hover:text-[#1b1c15] transition-opacity">Privacy Policy</Link>
              <Link href="/terms-of-service" className="text-[#5a403c]/70 hover:text-[#1b1c15] transition-opacity">Terms of Service</Link>
              <Link href="/contact" className="text-[#5a403c]/70 hover:text-[#1b1c15] transition-opacity underline decoration-[#8b0000]">Contact Us</Link>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 font-['Inter'] text-sm tracking-wide uppercase mt-4">
              <Link href="/help-center" className="text-[#5a403c]/70 hover:text-[#1b1c15] transition-opacity">Help Center</Link>
              <Link href="/become-instructor" className="text-[#5a403c]/70 hover:text-[#1b1c15] transition-opacity">Become an Instructor</Link>
            </div>
            {/* <div className="mt-8 sm:mt-12 flex gap-4 sm:gap-6 text-landing-on-surface-variant/40">
              <span className="material-symbols-outlined cursor-pointer hover:text-landing-primary transition-colors">gavel</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-landing-primary transition-colors">account_balance</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-landing-primary transition-colors">public</span>
            </div> */}
          </div>
        </div>
      </footer>

    </div>
  );
}

// Animated section components
function TrustSignalsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-12 sm:py-16 lg:py-20 bg-landing-surface-container-low overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <p className="text-center font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-8 sm:mb-12">In Partnership with Global Authorities</p>
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-16 lg:gap-32 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="font-headline text-xl sm:text-2xl font-bold tracking-tighter">ICC</span>
          <span className="font-headline text-xl sm:text-2xl font-bold tracking-tighter">LCIA</span>
          <span className="font-headline text-xl sm:text-2xl font-bold tracking-tighter">CIARB</span>
          <span className="font-headline text-xl sm:text-2xl font-bold tracking-tighter">HMRC</span>
          <span className="font-headline text-xl sm:text-2xl font-bold tracking-tighter">THE HAGUE</span>
        </div>
      </div>
    </section>
  );
}

function QualificationPathwaySection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 mb-16 lg:mb-24">
          <div className="col-span-12 md:col-span-5 lg:col-span-4">
            <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-landing-primary mb-6">A journey of mastery from foundational principles to elite international certification.</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-landing-outline-variant/10">
          {/* Card 1 */}
          <div className="bg-landing-surface p-6 sm:p-8 lg:p-12 hover:bg-landing-surface-container transition-all duration-300 group">
            <div className="mb-8 sm:mb-12 font-label text-landing-secondary font-semibold tracking-widest text-xs uppercase">Level I</div>
            <h3 className="font-headline text-xl sm:text-2xl text-landing-on-surface mb-4 sm:mb-6 group-hover:translate-x-2 transition-transform">The Gateway to Distinction (Associate)</h3>
            <p className="font-body text-landing-on-surface-variant leading-relaxed">Establish your foundation within the international ADR landscape. Designed for professionals seeking to bridge the gap between local practice and global standards.</p>
          </div>
          {/* Card 2 */}
          <div className="bg-landing-surface p-6 sm:p-8 lg:p-12 hover:bg-landing-surface-container transition-all duration-300 group">
            <div className="mb-8 sm:mb-12 font-label text-landing-secondary font-semibold tracking-widest text-xs uppercase">Level II</div>
            <h3 className="font-headline text-xl sm:text-2xl text-landing-on-surface mb-4 sm:mb-6 group-hover:translate-x-2 transition-transform">Strategic Mastery (Member)</h3>
            <p className="font-body text-landing-on-surface-variant leading-relaxed">Refine your expertise in the complexities of cross-border dispute resolution. For practitioners ready to navigate high-stakes international mediation and arbitration law.</p>
          </div>
          {/* Card 3 */}
          <div className="bg-landing-surface-container-highest p-6 sm:p-8 lg:p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-landing-primary text-landing-on-primary px-4 sm:px-6 py-2 text-[10px] font-label uppercase tracking-widest font-bold">Most Prestigious</div>
            <div className="mb-8 sm:mb-12 font-label text-landing-secondary font-semibold tracking-widest text-xs uppercase">Level III</div>
            <h3 className="font-headline text-xl sm:text-2xl text-landing-primary mb-4 sm:mb-6 group-hover:translate-x-2 transition-transform">The Pinnacle of Practice (Fellow)</h3>
            <p className="font-body text-landing-on-surface leading-relaxed mb-8">Our most prestigious designation. Reserved for those who have achieved absolute mastery in award writing and legal scholarship. The ultimate mark of a global expert.</p>
            <span className="material-symbols-outlined text-3xl sm:text-4xl text-landing-primary/30">workspace_premium</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CIMAAdvantageSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface-container transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          <div className="col-span-12 md:col-span-4">
            <div className="sticky top-40">
              <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary leading-tight mb-6 sm:mb-8">The CIMA Advantage: Unparalleled Pedigree</h2>
              <div className="w-12 sm:w-16 h-[2px] bg-landing-secondary"></div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-16 sm:space-y-20 lg:space-y-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-4 sm:space-y-6">
                <span className="material-symbols-outlined text-3xl sm:text-4xl text-landing-secondary">language</span>
                <h4 className="font-headline text-xl sm:text-2xl text-landing-on-surface">Elite Jurisdictional Network</h4>
                <p className="text-landing-on-surface-variant leading-relaxed">Connect with a curated circle of top-tier practitioners and influential decision-makers across every major legal jurisdiction.</p>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <span className="material-symbols-outlined text-3xl sm:text-4xl text-landing-secondary">verified</span>
                <h4 className="font-headline text-xl sm:text-2xl text-landing-on-surface">Tier-1 Accreditation</h4>
                <p className="text-landing-on-surface-variant leading-relaxed">Secure qualifications that carry weight in the world's most respected law firms and international arbitral tribunals.</p>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <span className="material-symbols-outlined text-3xl sm:text-4xl text-landing-secondary">school</span>
                <h4 className="font-headline text-xl sm:text-2xl text-landing-on-surface">Distinguished Scholar-Practitioners</h4>
                <p className="text-landing-on-surface-variant leading-relaxed">Learn under the guidance of world-renowned arbitrators and legal luminaries who are actively shaping the future of international law.</p>
              </div>
              <div className="relative overflow-hidden rounded-lg aspect-square bg-landing-surface">
                <img className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="a majestic private law library with floor-to-ceiling dark wood bookshelves, a green banker's lamp, and leather-bound journals" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMNUEcqXIG_64n8Tn7z_HvuBVn4dYFDUCtWuwomlbyTZXwOe9f2SbTPxXgS0mQuCzEQxoanUBgfFQN1ubW4fCw8is97I_jVjLoUUb4wX8HX01SOhhJMWC_W1AXAFK3Drev8Ct6dfMtX2wUq2uzk6v8X8My5a5Su69A5geI0FN0QafBNrOG6EdUfY1HY1Ow032Rt_lp7X7Wm4YonxjosIStgP8ZQO9EwnS_gIefzX9el_hA3orSv_xu459_8bpE-DrVvOuTP_WwMag" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-background border-y border-[#e3beb8]/10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-4 mb-12 sm:mb-16">
          <span className="w-6 sm:w-8 h-[1px] bg-landing-outline"></span>
          <span className="font-label text-xs uppercase tracking-[0.5em] text-landing-outline">Excellence Recognized</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="relative">
            <span className="text-6xl sm:text-8xl font-headline text-landing-secondary/20 absolute -top-8 sm:-top-10 -left-4 sm:-left-6">"</span>
            <blockquote className="relative">
              <p className="font-headline italic text-xl sm:text-2xl text-landing-on-surface mb-6 sm:mb-8 leading-snug">The CIMA curriculum offers a depth of intellectual rigor that is simply unparalleled. It was the catalyst for my elevation to the international arbitral tribunal.</p>
              <cite className="not-italic">
                <span className="block font-bold text-landing-primary uppercase tracking-widest text-xs mb-1">Mohammed Talib</span>
                <span className="block font-label text-landing-on-surface-variant text-xs">Partner, Pinsent Masons, Hong Kong | FCIArb, FCIMArb</span>
              </cite>
            </blockquote>
          </div>
          <div className="relative">
            <span className="text-6xl sm:text-8xl font-headline text-landing-secondary/20 absolute -top-8 sm:-top-10 -left-4 sm:-left-6">"</span>
            <blockquote className="relative">
              <p className="font-headline italic text-xl sm:text-2xl text-landing-on-surface mb-6 sm:mb-8 leading-snug">A sophisticated program that masterfully bridges the gap between theoretical jurisprudence and high-stakes practical application. Truly world-class.</p>
              <cite className="not-italic">
                <span className="block font-bold text-landing-primary uppercase tracking-widest text-xs mb-1">Iain Sharp</span>
                <span className="block font-label text-landing-on-surface-variant text-xs">Partner, Hill Dickinson | FCIArb, FCIMArb</span>
              </cite>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-20 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-12 relative overflow-hidden bg-landing-primary text-landing-on-primary transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#8b0000] to-landing-primary"></div>
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl md:text-7xl mb-8 sm:mb-10 tracking-tight">Enter the Global Circle</h2>
        <p className="font-body text-lg sm:text-xl text-landing-on-primary-container mb-12 sm:mb-16 leading-relaxed">Applications for {new Date().getFullYear()} Fellowship cohort are now being reviewed. Secure your place among the leaders of international law.</p>
        <Link href="/register">
          <button className="bg-landing-surface text-landing-primary px-8 sm:px-12 lg:px-14 py-4 sm:py-6 rounded-DEFAULT font-label uppercase tracking-[0.3em] text-sm hover:bg-landing-background transition-all shadow-xl active:scale-95">
            Begin Your Ascension
          </button>
        </Link>
      </div>
      {/* Accent lines */}
      {/* <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-landing-on-primary"></div>
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-landing-on-primary"></div>
      </div> */}
    </section>
  );
}

