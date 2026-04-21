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
            <div className="col-span-12 md:col-span-6 z-10 text-left">
              <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-7xl leading-[1.1] text-landing-primary mb-6 sm:mb-8 tracking-tight text-left">
                The Definitive Standard in <span className="italic">Self-Paced Learning</span>
              </h1>
              <p className="font-body text-base sm:text-lg md:text-xl text-landing-on-surface-variant leading-relaxed max-w-lg mb-8 sm:mb-12 text-left">
                Join a global cadre of legal elite. Elevate your practice through rigorous ADR training and certifications recognized by the world's leading arbitral institutions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Link href="/courses">
                  <button className="bg-landing-primary text-landing-on-primary px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-DEFAULT font-label uppercase tracking-[0.2em] text-xs sm:text-sm hover:bg-landing-primary-container transition-all">
                    Browse Courses
                  </button>
                </Link>
                {/* <Link href="/qualification-pathway">
                  <button className="border border-landing-outline/20 text-landing-primary px-10 py-5 rounded-DEFAULT font-label uppercase tracking-[0.2em] text-sm hover:bg-landing-surface-container transition-all">
                    Explore Pathways
                  </button>
                </Link> */}
                <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
                  <button className="border border-landing-outline/20 text-landing-primary px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 rounded-DEFAULT font-label uppercase tracking-[0.2em] text-xs sm:text-sm hover:bg-landing-surface-container transition-all">
                    Explore Pathways
                  </button>
                </a>
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

        {/* NEW SECTION: RIAC Partnership */}
        <RIACPartnershipSection />

        
        {/* Qualification Pathway: Ladder of Mastery */}
        <QualificationPathwaySection />

        {/* The CIMA Advantage: Unparalleled Pedigree */}
        <CIMAAdvantageSection />

        {/* NEW SECTION 3: Institutional Network */}
        <InstitutionalNetworkSection />

        {/* NEW SECTION: Learning Paths */}
        <LearningPathsSection />

        {/* NEW SECTION: Featured Courses */}
        <FeaturedCoursesSection />

        {/* NEW SECTION: Why Choose Us */}
        <WhyChooseUsSection />

        {/* NEW SECTION: Meet the Faculty */}
        <MeetTheFacultySection />

        {/* NEW SECTION: Student Reviews */}
        <StudentReviewsSection />

        {/* NEW SECTION: Partners & Accrediting Institutions */}
        <PartnersSection />

        {/* NEW SECTION 4: Global Institutional Engagement */}
        <GlobalInstitutionalEngagementSection />

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


function QualificationPathwaySection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 mb-16 lg:mb-24">
          <div className="col-span-12 md:col-span-5 lg:col-span-4 text-left">
            <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-landing-primary mb-6 text-left">A journey of mastery from foundational principles to elite international certification.</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-landing-outline-variant/10">
          {/* Card 1 */}
          <div className="bg-landing-surface p-6 sm:p-8 lg:p-12 hover:bg-landing-surface-container transition-all duration-300 group">
            <div className="mb-8 sm:mb-12 font-label text-landing-secondary font-semibold tracking-widest text-xs uppercase">Part I</div>
            <h3 className="font-headline text-xl sm:text-2xl text-landing-on-surface mb-4 sm:mb-6 group-hover:translate-x-2 transition-transform text-left">The Gateway to Distinction (Associate)</h3>
            <p className="font-body text-landing-on-surface-variant leading-relaxed text-left">Establish your foundation within the international ADR landscape. Designed for professionals seeking to bridge the gap between local practice and global standards.</p>
          </div>
          {/* Card 2 */}
          <div className="bg-landing-surface p-6 sm:p-8 lg:p-12 hover:bg-landing-surface-container transition-all duration-300 group">
            <div className="mb-8 sm:mb-12 font-label text-landing-secondary font-semibold tracking-widest text-xs uppercase">Part II</div>
            <h3 className="font-headline text-xl sm:text-2xl text-landing-on-surface mb-4 sm:mb-6 group-hover:translate-x-2 transition-transform text-left">Strategic Mastery (Member)</h3>
            <p className="font-body text-landing-on-surface-variant leading-relaxed text-left">Refine your expertise in the complexities of cross-border dispute resolution. For practitioners ready to navigate high-stakes international mediation and arbitration law.</p>
          </div>
          {/* Card 3 */}
          <div className="bg-landing-surface-container-highest p-6 sm:p-8 lg:p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-landing-primary text-landing-on-primary px-4 sm:px-6 py-2 text-[10px] font-label uppercase tracking-widest font-bold">Most Prestigious</div>
            <div className="mb-8 sm:mb-12 font-label text-landing-secondary font-semibold tracking-widest text-xs uppercase">Part III</div>
            <h3 className="font-headline text-xl sm:text-2xl text-landing-primary mb-4 sm:mb-6 group-hover:translate-x-2 transition-transform text-left">The Pinnacle of Practice (Fellow)</h3>
            <p className="font-body text-landing-on-surface leading-relaxed mb-8 text-left">Our most prestigious designation. Reserved for those who have achieved absolute mastery in award writing and legal scholarship. The ultimate mark of a global expert.</p>
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
      className={`py-16 px-12 bg-surface-container transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full h-[600px] overflow-hidden rounded-lg">
          <img className="w-full h-full object-cover object-bottom" data-alt="a majestic private law library with floor-to-ceiling dark wood bookshelves, a green banker's lamp, and leather-bound journals" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMNUEcqXIG_64n8Tn7z_HvuBVn4dYFDUCtWuwomlbyTZXwOe9f2SbTPxXgS0mQuCzEQxoanUBgfFQN1ubW4fCw8is97I_jVjLoUUb4wX8HX01SOhhJMWC_W1AXAFK3Drev8Ct6dfMtX2wUq2uzk6v8X8My5a5Su69A5geI0FN0QafBNrOG6EdUfY1HY1Ow032Rt_lp7X7Wm4YonxjosIStgP8ZQO9EwnS_gIefzX9el_hA3orSv_xu459_8bpE-DrVvOuTP_WwMag"/>
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
      <div className="max-w-7xl mx-auto text-left">
        <div className="flex items-center space-x-4 mb-12 sm:mb-16">
          <span className="w-6 sm:w-8 h-[1px] bg-landing-outline"></span>
          <span className="font-label text-xs uppercase tracking-[0.5em] text-landing-outline">Excellence Recognized</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="relative">
            <span className="text-6xl sm:text-8xl font-headline text-landing-secondary/20 absolute -top-8 sm:-top-10 -left-4 sm:-left-6">"</span>
            <blockquote className="relative">
              <p className="font-headline italic text-xl sm:text-2xl text-landing-on-surface mb-6 sm:mb-8 leading-snug text-left">The CIMA curriculum offers a depth of intellectual rigor that is simply unparalleled. It was the catalyst for my elevation to the international arbitral tribunal.</p>
              <cite className="not-italic">
                <span className="block font-bold text-landing-primary uppercase tracking-widest text-xs mb-1">Mohammed Talib</span>
                <span className="block font-label text-landing-on-surface-variant text-xs">Partner, Pinsent Masons, Hong Kong | FCIArb, FCIMArb</span>
              </cite>
            </blockquote>
          </div>
          <div className="relative">
            <span className="text-6xl sm:text-8xl font-headline text-landing-secondary/20 absolute -top-8 sm:-top-10 -left-4 sm:-left-6">"</span>
            <blockquote className="relative">
              <p className="font-headline italic text-xl sm:text-2xl text-landing-on-surface mb-6 sm:mb-8 leading-snug text-left">A sophisticated program that masterfully bridges the gap between theoretical jurisprudence and high-stakes practical application. Truly world-class.</p>
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



const PARTNER_LOGOS = [
  {
    name: "Law Society of Kenya",
    url: "/images/partners/lsk.png",
    alt: "Law Society of Kenya Logo"
  },
  {
    name: "Bank of Ghana",
    url: "/images/partners/bog.png",
    alt: "Bank of Ghana Logo"
  },
  {
    name: "African Bar Association",
    url: "/images/partners/afribar.png",
    alt: "African Bar Association Logo"
  },
  {
    name: "International Chamber of Commerce (ICC)",
    url: "https://getlogo.net/wp-content/uploads/2020/03/international-chamber-of-commerce-icc-logo-vector.png",
    alt: "International Chamber of Commerce Logo"
  },
  {
    name: "London Court of International Arbitration (LCIA)",
    url: "/images/partners/lcia.png",
    alt: "LCIA Logo"
  },
  {
    name: "Chartered Institute of Arbitrators (CIArb)",
    url: "/images/partners/ciarb.png",
    alt: "CIArb Logo"
  },
  {
    name: "HM Revenue & Customs (HMRC)",
    url: "/images/partners/HMRC_Logo.png",
    alt: "HM Revenue & Customs Logo"
  },
  {
    name: "Pinsent Masons",
    url: "https://getlogo.net/wp-content/uploads/2019/11/pinsent-masons-logo-vector.png",
    alt: "Pinsent Masons Logo"
  }
];


// NEW SECTION 3: Institutional Network
function InstitutionalNetworkSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  // Create duplicate array for infinite scroll effect
  const duplicatedLogos = [...PARTNER_LOGOS, ...PARTNER_LOGOS];
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{
        animation: 'fadeIn 1s ease-out'
      }}
    >
      <style>
        {`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-scroll {
            animation: scroll 20s linear infinite;
            display: flex;
            align-items: center;
          }
          .animate-scroll:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-landing-primary mb-12 text-center">Trusted by Leading Institutions</h2>
          <div className="relative overflow-hidden p-8 sm:p-12">
            <div 
              className="flex items-center gap-8 xs:gap-12 sm:gap-16 md:gap-20 lg:gap-24 animate-scroll"
              style={{
                animation: 'scroll 20s linear infinite',
                width: 'max-content'
              }}
            >
              {/* First set of logos */}
              {PARTNER_LOGOS.map((partner, index) => (
                <div key={`original-${partner.name}`} className="flex flex-col items-center gap-2 xs:gap-3 min-w-fit flex-shrink-0">
                  <img 
                    alt={`${partner.name} Logo`} 
                    className="h-12 xs:h-14 sm:h-16 md:h-18 lg:h-20 logo-tint opacity-60 hover:opacity-100 transition-opacity object-contain w-auto max-w-[180px]" 
                    src={partner.url}
                    onError={(e) => {
                      console.log(`Failed to load logo for ${partner.name}:`, partner.url);
                      const target = e.target as HTMLImageElement;
                      target.style.border = '2px solid red';
                      target.alt = `FAILED: ${partner.name}`;
                    }}
                  />
                  <span className="text-xs xs:text-sm text-landing-on-surface-variant/70 font-label uppercase tracking-wider hidden xs:block sm:text-xs text-center max-w-[160px]">
                    {partner.name}
                  </span>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {PARTNER_LOGOS.map((partner, index) => (
                <div key={`duplicate-${partner.name}`} className="flex flex-col items-center gap-2 xs:gap-3 min-w-fit flex-shrink-0">
                  <img 
                    alt={`${partner.name} Logo`} 
                    className="h-12 xs:h-14 sm:h-16 md:h-18 lg:h-20 logo-tint opacity-60 hover:opacity-100 transition-opacity object-contain w-auto max-w-[180px]" 
                    src={partner.url}
                    onError={(e) => {
                      console.log(`Failed to load duplicate logo for ${partner.name}:`, partner.url);
                      const target = e.target as HTMLImageElement;
                      target.style.border = '2px solid red';
                      target.alt = `FAILED: ${partner.name}`;
                    }}
                  />
                  <span className="text-xs xs:text-sm text-landing-on-surface-variant/70 font-label uppercase tracking-wider hidden xs:block sm:text-xs text-center max-w-[160px]">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Institutional logos data
const INSTITUTION_LOGOS = [
  // Primary Institutions
  { name: "International Chamber of Commerce (ICC) International Court of Arbitration", acronym: "ICC", logo: "/images/institutions/icc-logo.png" },
  { name: "London Court of International Arbitration (LCIA)", acronym: "LCIA", logo: "/images/institutions/lcia-logo.jpg" },
  { name: "Singapore International Arbitration Centre (SIAC)", acronym: "SIAC", logo: "/images/institutions/siac-logo.png" },
  { name: "Hong Kong International Arbitration Centre (HKIAC)", acronym: "HKIAC", logo: "/images/institutions/hkiac-logo.png" },
  { name: "American Arbitration Association (AAA)", acronym: "AAA", logo: "/images/institutions/aaa-logo.jpg" },
  { name: "International Centre for Dispute Resolution (ICDR)", acronym: "ICDR", logo: "/images/institutions/icdr-logo.jpg" },
  { name: "International Centre for Settlement of Investment Disputes (ICSID)", acronym: "ICSID", logo: "/images/institutions/icsid-logo.png" },
  { name: "Permanent Court of Arbitration (PCA)", acronym: "PCA", logo: "/images/institutions/pca-logo.png" },
  { name: "Stockholm Chamber of Commerce (SCC) Arbitration Institute", acronym: "SCC", logo: "/images/institutions/scc-logo.png" },
  { name: "Swiss Arbitration Centre", acronym: "SAC", logo: "/images/institutions/sac-logo.png" },
  
  // Specialised & Regional ADR Institutions
  { name: "Dubai International Arbitration Centre (DIAC)", acronym: "DIAC", logo: "/images/institutions/diac-logo.png" },
  { name: "Abu Dhabi Global Market Arbitration Centre (ADGMAC)", acronym: "ADGMAC", logo: "/images/institutions/adgmac-logo.png" },
  { name: "China International Economic and Trade Arbitration Commission (CIETAC)", acronym: "CIETAC", logo: "/images/institutions/cietac-logo.jpg" },
  { name: "Japan Commercial Arbitration Association (JCAA)", acronym: "JCAA", logo: "/images/institutions/jcaa-logo.png" },
  { name: "Asian International Arbitration Centre (AIAC)", acronym: "AIAC", logo: "/images/institutions/aiac-logo.png" },
  { name: "Cairo Regional Centre for International Commercial Arbitration (CRCICA)", acronym: "CRCICA", logo: "/images/institutions/crcica-logo.png" },
  { name: "Lagos Court of Arbitration (LCA)", acronym: "LCA", logo: "/images/institutions/lca-logo.jpg" },
  { name: "Arbitration Foundation of Southern Africa (AFSA)", acronym: "AFSA", logo: "/images/institutions/afsa-logo.jpg" },
  
  // Mediation & Hybrid Dispute Resolution Bodies
  { name: "Centre for Effective Dispute Resolution (CEDR)", acronym: "CEDR", logo: "/images/institutions/cedr-logo.jpg" },
  { name: "World Intellectual Property Organization (WIPO) Arbitration and Mediation Center", acronym: "WIPO", logo: "/images/institutions/wipo-logo.png" }
];

// NEW SECTION 4: Global Institutional Engagement
function GlobalInstitutionalEngagementSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface-container transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-left max-w-4xl mx-auto mb-16 sm:mb-20">
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 sm:mb-8 leading-tight text-left">Global Institutional Engagement</h2>
          <p className="font-body text-lg sm:text-xl text-landing-on-surface-variant leading-relaxed text-left">
            Our Mediators and Arbitrators maintain active professional engagements with leading arbitral and mediation institutions across the world. Through these affiliations, CIMA members operate at the forefront of international dispute resolution.
          </p>
        </div>
        <div className="space-y-16 sm:space-y-20 lg:space-y-24">
          {/* Primary Institutions */}
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {INSTITUTION_LOGOS.slice(0, 10).map((institution, index) => (
                <div key={`primary-${index}`} className="flex flex-col items-center justify-center p-4 sm:p-6 border border-landing-outline-variant/20 bg-landing-surface hover:bg-landing-surface-container-low transition-colors group text-center min-h-[140px] sm:min-h-[180px] rounded-lg">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 flex items-center justify-center">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.acronym} Logo`}
                      className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                          />
                  </div>
                  <p className="font-body text-xs text-landing-on-surface-variant leading-relaxed">{institution.name}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Specialised & Regional ADR Institutions */}
          <div>
            <h3 className="font-headline text-2xl sm:text-3xl text-landing-primary mb-8 sm:mb-12 text-left">Specialised & Regional ADR Institutions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {INSTITUTION_LOGOS.slice(10, 18).map((institution, index) => (
                <div key={`regional-${index}`} className="flex flex-col items-center justify-center p-4 sm:p-6 border border-landing-outline-variant/20 bg-landing-surface hover:bg-landing-surface-container-low transition-colors group text-center min-h-[140px] sm:min-h-[180px] rounded-lg">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 flex items-center justify-center">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.acronym} Logo`}
                      className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                          />
                  </div>
                  <p className="font-body text-xs text-landing-on-surface-variant leading-relaxed">{institution.name}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Mediation & Hybrid Dispute Resolution Bodies */}
          <div>
            <h3 className="font-headline text-2xl sm:text-3xl text-landing-primary mb-8 sm:mb-12 text-left">Mediation & Hybrid Dispute Resolution Bodies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {INSTITUTION_LOGOS.slice(18, 20).map((institution, index) => (
                <div key={`mediation-${index}`} className="flex flex-col items-center justify-center p-4 sm:p-6 border border-landing-outline-variant/20 bg-landing-surface hover:bg-landing-surface-container-low transition-colors group text-center min-h-[140px] sm:min-h-[180px] rounded-lg">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 sm:mb-4 flex items-center justify-center">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.acronym} Logo`}
                      className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                          />
                  </div>
                  <p className="font-body text-xs text-landing-on-surface-variant leading-relaxed">{institution.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// NEW SECTION: RIAC Partnership
function RIACPartnershipSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface-container transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-landing-primary mb-8 sm:mb-12 leading-tight">In Partnership with Bar Associations and Arbitral Bodies</h2>
          <div className="max-w-4xl mx-auto">
            <p className="font-body text-lg sm:text-xl text-landing-on-surface leading-relaxed text-left">
              CIMA is pleased to support Russian International Arbitration Congress 2026, a leading global forum for arbitration practitioners.
This underscores our commitment to advancing best practice in Eastern Europe. 
            </p>
          </div>
          {/* RIAC Logo */}
          <div className="mt-8 sm:mt-12 flex justify-center">
            <img 
              src="/images/institutions/riac-logo.png"
              alt="Russian International Arbitration Centre Logo"
              className="h-16 sm:h-20 lg:h-24 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
    </section>
  );
}


// Learning Paths Section
function LearningPathsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const learningPaths = [
    {
      name: "International Arbitration",
      count: "12 courses",
      icon: "gavel",
      color: "bg-landing-primary/10 text-landing-primary"
    },
    {
      name: "Mediation & Conciliation", 
      count: "9 courses",
      icon: "handshake",
      color: "bg-landing-secondary/10 text-landing-secondary"
    },
    {
      name: "Investor-State Disputes",
      count: "10 courses", 
      icon: "public",
      color: "bg-landing-tertiary/10 text-landing-tertiary"
    },
    {
      name: "ADR Certification Prep",
      count: "8 courses",
      icon: "verified",
      color: "bg-green-100 text-green-700"
    },
    {
      name: "Contract Drafting",
      count: "7 courses",
      icon: "description",
      color: "bg-blue-100 text-blue-700"
    },
    {
      name: "Emergency Proceedings",
      count: "5 courses",
      icon: "timer",
      color: "bg-orange-100 text-orange-700"
    }
  ];
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-left mb-16 sm:mb-20">
          <p className="font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-4">Browse by category</p>
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 leading-tight text-left">Learning paths for learners</h2>
          <p className="font-body text-lg sm:text-xl text-landing-on-surface-variant leading-relaxed max-w-2xl text-left">Structured tracks built for every stage of your ADR career.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {learningPaths.map((path, index) => (
            <div 
              key={path.name}
              className={`group bg-landing-surface-container p-6 sm:p-8 border border-landing-outline-variant/15 hover:border-landing-primary/30 hover:bg-landing-surface-container-high transition-all duration-300 cursor-pointer rounded-lg`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${path.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-2xl sm:text-3xl">{path.icon}</span>
              </div>
              <h3 className="font-headline text-lg sm:text-xl text-landing-on-surface mb-3 group-hover:text-landing-primary transition-colors text-left">{path.name}</h3>
              <p className="font-body text-sm text-landing-on-surface-variant text-left">{path.count}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Featured Courses Section
function FeaturedCoursesSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const featuredCourses = [
    {
      title: "Mediation Skills & Practice: Facilitation to Closure",
      category: "Mediation",
      instructor: "Prof. Adaeze Nwosu, FCIArb",
      rating: 4.9,
      students: 1248,
      modules: 6,
      hours: 18,
      level: "All levels",
      cpd: 8,
      badge: "Bestseller",
      color: "bg-landing-primary/10 text-landing-primary"
    },
    {
      title: "International Commercial Arbitration: End-to-End Practice",
      category: "Arbitration",
      instructor: "Dr. Ivan Petrov, RIAC Panel",
      rating: 4.8,
      students: 976,
      modules: 8,
      hours: 24,
      level: "Intermediate",
      cpd: 12,
      badge: "Certificate",
      color: "bg-landing-secondary/10 text-landing-secondary"
    },
    {
      title: "ISDS: Treaty Claims, BITs & ICSID Practice",
      category: "Investment Law",
      instructor: "Prof. Kwame Asante, ICJ Consultant",
      rating: 4.9,
      students: 702,
      modules: 10,
      hours: 30,
      level: "Advanced",
      cpd: 18,
      badge: "Diploma",
      color: "bg-landing-tertiary/10 text-landing-tertiary"
    },
    {
      title: "Drafting Enforceable Arbitration Clauses",
      category: "Drafting",
      instructor: "Ms. Sarah Okafor, Senior Counsel",
      rating: 4.7,
      students: 514,
      modules: 3,
      hours: 9,
      level: "Intermediate",
      cpd: 6,
      badge: "Certificate",
      color: "bg-green-100 text-green-700"
    },
    {
      title: "Emergency Arbitration: Urgent Relief in Cross-Border Disputes",
      category: "Emergency Proceedings",
      instructor: "Dr. Elena Morozova, LCIA Arbitrator",
      rating: 4.8,
      students: 389,
      modules: 4,
      hours: 12,
      level: "Advanced",
      cpd: 8,
      badge: "New",
      color: "bg-orange-100 text-orange-700"
    }
  ];
  
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-500">{"\u2605"}</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-500">{"\u2606"}</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">{"\u2606"}</span>);
    }
    
    return stars;
  };
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface-container-low transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-16 sm:mb-20 flex-wrap gap-4">
          <div>
            <p className="font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-4">Top rated</p>
            <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 leading-tight text-left">Featured courses for Lawyers</h2>
            <p className="font-body text-lg sm:text-xl text-landing-on-surface-variant leading-relaxed max-w-2xl text-left">Curated by our academic board. Recognized by ICC, LCIA, SIAC, RIAC and CIArb.</p>
          </div>
          <Link href="/courses" className="text-landing-primary font-label uppercase tracking-widest text-sm font-bold group hover:text-landing-secondary transition-colors flex items-center gap-2">
            View all courses
            <span className="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredCourses.map((course, index) => (
            <div 
              key={course.title}
              className="group bg-landing-surface border border-landing-outline-variant/15 hover:border-landing-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer rounded-lg overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Course Header */}
              <div className={`h-32 ${course.color} relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20"></div>
                </div>
                <div className="relative z-10 h-full flex items-center justify-center p-4">
                  <h3 className="font-headline text-lg sm:text-xl text-center font-bold">{course.category}</h3>
                </div>
              </div>
              
              {/* Course Body */}
              <div className="p-6">
                <div className="mb-3">
                  <span className="font-label text-xs uppercase tracking-widest text-landing-on-surface-variant/60">{course.category}</span>
                </div>
                <h4 className="font-headline text-base sm:text-lg text-landing-on-surface mb-3 leading-tight line-clamp-2 group-hover:text-landing-primary transition-colors">
                  {course.title}
                </h4>
                <p className="font-body text-sm text-landing-on-surface-variant mb-4">{course.instructor}</p>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-body text-sm font-bold text-yellow-600">{course.rating}</span>
                  <div className="flex text-sm">
                    {renderStars(course.rating)}
                  </div>
                  <span className="font-body text-xs text-landing-on-surface-variant">({course.students})</span>
                </div>
                
                {/* Course Meta */}
                <div className="flex items-center gap-3 text-xs text-landing-on-surface-variant mb-4">
                  <span>{course.modules} modules</span>
                  <span className="w-1 h-1 bg-landing-outline-variant rounded-full"></span>
                  <span>{course.hours} hrs</span>
                  <span className="w-1 h-1 bg-landing-outline-variant rounded-full"></span>
                  <span>{course.level}</span>
                </div>
              </div>
              
              {/* Course Footer */}
              <div className="border-t border-landing-outline-variant/10 p-4 flex justify-between items-center">
                <span className={`font-label text-xs px-2 py-1 rounded ${course.color}`}>
                  {course.badge}
                </span>
                <span className="font-body text-xs text-landing-on-surface-variant">{course.cpd} CPD hrs</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Why Choose Us Section
function WhyChooseUsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const features = [
    {
      icon: "workspace_premium",
      title: "Globally recognised certifications",
      description: "CIMA certificates are accepted by ICC, LCIA, SIAC, ICSID and RIAC panels. Co-badged with your local bar association where applicable.",
      color: "bg-landing-primary/10 text-landing-primary"
    },
    {
      icon: "verified",
      title: "CPD / CLE accredited",
      description: "Every course carries verifiable continuing professional development hours recognised by bar associations in 38 jurisdictions worldwide.",
      color: "bg-landing-secondary/10 text-landing-secondary"
    },
    {
      icon: "school",
      title: "Expert practitioners as instructors",
      description: "Learn from sitting arbitrators, tribunal secretaries, RIAC panel members, and senior counsel with active international caseloads.",
      color: "bg-landing-tertiary/10 text-landing-tertiary"
    },
    {
      icon: "schedule",
      title: "Self-paced with lifetime access",
      description: "On-demand video, downloadable case studies, interactive assessments, and automatic course updates all at your pace on any device.",
      color: "bg-green-100 text-green-700"
    },
    {
      icon: "groups",
      title: "Global professional community",
      description: "Join a private network of 4,800+ ADR professionals. Access mentorship, peer discussion forums, and referral pathways.",
      color: "bg-blue-100 text-blue-700"
    },
    {
      icon: "shield",
      title: "Bar association co-badging",
      description: "Certificates issued in collaboration with 14 bar associations and professional bodies, carrying dual institutional authority.",
      color: "bg-orange-100 text-orange-700"
    }
  ];
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-left mb-16 sm:mb-20">
          <p className="font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-4">Why choose us</p>
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 leading-tight text-left">Built for the world's best legal minds</h2>
          <p className="font-body text-lg sm:text-xl text-landing-on-surface-variant leading-relaxed max-w-2xl text-left">Every feature on this platform exists to serve serious ADR practitioners.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group bg-landing-surface-container p-6 sm:p-8 border border-landing-outline-variant/15 hover:border-landing-primary/30 hover:shadow-lg transition-all duration-300 rounded-lg"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-2xl sm:text-3xl">{feature.icon}</span>
              </div>
              <h3 className="font-headline text-lg sm:text-xl text-landing-on-surface mb-4 group-hover:text-landing-primary transition-colors text-left">{feature.title}</h3>
              <p className="font-body text-sm text-landing-on-surface-variant leading-relaxed text-left">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Meet the Faculty Section
function MeetTheFacultySection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const instructors = [
    {
      initials: "AN",
      name: "Prof. Adaeze Nwosu",
      title: "FCIArb · Senior Mediator, Lagos & London",
      rating: 4.9,
      students: 1248,
      courses: 2,
      color: "bg-landing-primary text-landing-on-primary"
    },
    {
      initials: "IP",
      name: "Dr. Ivan Petrov",
      title: "RIAC Panel Member · Moscow & Geneva",
      rating: 4.8,
      students: 976,
      courses: 3,
      color: "bg-landing-secondary text-landing-on-secondary"
    },
    {
      initials: "KA",
      name: "Prof. Kwame Asante",
      title: "ICJ Consultant · Ghana Bar Association",
      rating: 4.9,
      students: 702,
      courses: 2,
      color: "bg-landing-tertiary text-landing-on-tertiary"
    },
    {
      initials: "EM",
      name: "Dr. Elena Morozova",
      title: "LCIA Arbitrator · Emergency Relief Specialist",
      rating: 4.8,
      students: 389,
      courses: 2,
      color: "bg-purple-600 text-white"
    }
  ];
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface-container-low transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-16 sm:mb-20 flex-wrap gap-4">
          <div>
            <p className="font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-4">Meet the faculty</p>
            <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 leading-tight text-left">Learn from the best trainers</h2>
            <p className="font-body text-lg sm:text-xl text-landing-on-surface-variant leading-relaxed max-w-2xl text-left">Our instructors are active practitioners not just academics.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {instructors.map((instructor, index) => (
            <div 
              key={instructor.name}
              className="group bg-landing-surface border border-landing-outline-variant/15 hover:border-landing-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer rounded-lg text-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Avatar */}
              <div className="p-6">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${instructor.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <span className="font-headline text-2xl sm:text-3xl font-bold">{instructor.initials}</span>
                </div>
                
                {/* Name and Title */}
                <h3 className="font-headline text-lg text-landing-on-surface mb-2 group-hover:text-landing-primary transition-colors">{instructor.name}</h3>
                <p className="font-body text-sm text-landing-on-surface-variant leading-relaxed mb-6 px-4">{instructor.title}</p>
                
                {/* Stats */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="font-headline text-lg font-bold text-landing-on-surface">{instructor.rating}{"\u2605"}</div>
                    <div className="font-body text-xs text-landing-on-surface-variant">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="font-headline text-lg font-bold text-landing-on-surface">{instructor.students.toLocaleString()}</div>
                    <div className="font-body text-xs text-landing-on-surface-variant">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="font-headline text-lg font-bold text-landing-on-surface">{instructor.courses}</div>
                    <div className="font-body text-xs text-landing-on-surface-variant">Courses</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Student Reviews Section
function StudentReviewsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const testimonials = [
    {
      quote: "The ISDS track is the most practically grounded course I have encountered far beyond what standard LLM programmes offer. I use the materials in active cases.",
      author: "A. Mensah-Bonsu",
      role: "Partner · Ghana Bar Association",
      initials: "AM",
      color: "bg-landing-primary text-landing-on-primary"
    },
    {
      quote: "I passed my CIArb fellowship interview the month after completing the Commercial Arbitration track. The preparation was genuinely invaluable worth every hour.",
      author: "S. Osei-Agyemang",
      role: "Barrister · Nigerian Bar Association",
      initials: "SO",
      color: "bg-landing-secondary text-landing-on-secondary"
    },
    {
      quote: "The RIAC co-certification gave me immediate credibility with Eastern European clients. The platform itself is beautifully structured I completed it during trial prep.",
      author: "D. Volkov",
      role: "Counsel · RIAC Arbitration Panel",
      initials: "DV",
      color: "bg-landing-tertiary text-landing-on-tertiary"
    },
    {
      quote: "The cross-cultural mediation module alone transformed how I approach disputes. No other programme comes close for practitioners in East African jurisdictions.",
      author: "N. Kariuki",
      role: "Senior Associate · East Africa Law Society",
      initials: "NK",
      color: "bg-green-600 text-white"
    }
  ];
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-left mb-16 sm:mb-20">
          <p className="font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-4">Student reviews</p>
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 leading-tight text-left">What our learners say</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.author}
              className="group bg-landing-surface-container p-6 sm:p-8 border border-landing-outline-variant/15 hover:border-landing-primary/30 hover:shadow-lg transition-all duration-300 rounded-lg"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Stars */}
              <div className="flex text-yellow-500 text-sm mb-6">
                <span>{"\u2605"}</span>
                <span>{"\u2605"}</span>
                <span>{"\u2605"}</span>
                <span>{"\u2605"}</span>
                <span>{"\u2605"}</span>
              </div>
              
              {/* Quote */}
              <blockquote className="relative">
                <div className="absolute -top-2 -left-2 text-6xl sm:text-8xl font-headline text-landing-primary/20 leading-none">"</div>
                <p className="font-headline italic text-base sm:text-lg text-landing-on-surface-variant leading-relaxed mb-8 pl-8 relative">
                  {testimonial.quote}
                </p>
              </blockquote>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${testimonial.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="font-headline text-sm font-bold">{testimonial.initials}</span>
                </div>
                <div>
                  <div className="font-headline text-sm font-bold text-landing-on-surface">{testimonial.author}</div>
                  <div className="font-body text-xs text-landing-on-surface-variant">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Partners & Accrediting Institutions Section
function PartnersSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const partners = [
    {
      name: "Russian International Arbitration Congress (RIAC)",
      type: "Featured partner",
      url: "riac-arbitration.com",
      website: "https://riac-arbitration.com",
      featured: true
    },
    {
      name: "ICC International Chamber of Commerce",
      type: "Arbitral institution",
      url: "iccwbo.org",
      website: "https://iccwbo.org",
      featured: false
    },
    {
      name: "LCIA London Court of International Arbitration",
      type: "Arbitral institution",
      url: "lcia.org",
      website: "https://www.lcia.org",
      featured: false
    },
    {
      name: "SIAC Singapore International Arbitration Centre",
      type: "Arbitral institution",
      url: "siac.org.sg",
      website: "https://www.siac.org.sg",
      featured: false
    },
    {
      name: "ICSID World Bank Group",
      type: "Arbitral institution",
      url: "icsid.worldbank.org",
      website: "https://icsid.worldbank.org",
      featured: false
    },
    {
      name: "Chartered Institute of Arbitrators (CIArb)",
      type: "Professional body",
      url: "ciarb.org",
      website: "https://www.ciarb.org",
      featured: false
    },
    {
      name: "Ghana Bar Association",
      type: "Bar association",
      url: "ghanabar.org",
      website: "https://ghanabar.org",
      featured: false
    },
    {
      name: "Nigerian Bar Association",
      type: "Bar association",
      url: "nigerianbar.org.ng",
      website: "https://nigerianbar.org.ng",
      featured: false
    },
    {
      name: "East Africa Law Society",
      type: "Bar association",
      url: "ealawsociety.org",
      website: "https://ealawsociety.org",
      featured: false
    }
  ];
  
  return (
    <section 
      ref={ref}
      className={`py-16 sm:py-20 lg:py-32 px-4 sm:px-6 lg:px-12 bg-landing-surface-container-low transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-left mb-16 sm:mb-20">
          <p className="font-label text-xs uppercase tracking-[0.4em] text-landing-on-surface-variant/60 mb-4">Our network</p>
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-landing-primary mb-6 leading-tight text-left">Partners & accrediting institutions</h2>
          <p className="font-body text-lg sm:text-xl text-landing-on-surface-variant leading-relaxed max-w-2xl text-left">Every certification carries the weight of institutional recognition.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {partners.map((partner, index) => (
            <a 
              key={partner.name}
              href={partner.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-landing-surface border p-6 sm:p-8 border-landing-outline-variant/15 hover:border-landing-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer rounded-lg block ${
                partner.featured ? 'bg-landing-tertiary/5 border-landing-tertiary/30' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Type Label */}
              {partner.featured && (
                <div className="mb-3">
                  <span className="font-label text-xs uppercase tracking-widest text-landing-tertiary">
                    {partner.type}
                  </span>
                </div>
              )}
              
              {/* Partner Name */}
              <h3 className={`font-headline text-base sm:text-lg leading-tight mb-3 group-hover:text-landing-primary transition-colors ${
                partner.featured ? 'text-landing-tertiary' : 'text-landing-on-surface'
              }`}>
                {partner.name}
              </h3>
              
              {/* Type for non-featured */}
              {!partner.featured && (
                <div className="mb-4">
                  <span className="font-body text-xs text-landing-on-surface-variant uppercase tracking-widest">
                    {partner.type}
                  </span>
                </div>
              )}
              
              {/* URL */}
              <div className={`font-body text-sm group-hover:text-landing-primary transition-colors flex items-center gap-1 ${
                partner.featured ? 'text-landing-tertiary' : 'text-landing-primary'
              }`}>
                {partner.url}
                <span className="text-xs">{"\u2197"}</span>
              </div>
            </a>
          ))}
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
      <div className="max-w-4xl mx-auto text-left relative z-10">
        <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl md:text-7xl mb-8 sm:mb-10 tracking-tight text-left">Enter the Global Circle</h2>
        <p className="font-body text-lg sm:text-xl text-landing-on-primary-container mb-12 sm:mb-16 leading-relaxed text-left">Applications for {new Date().getFullYear()} Fellowship cohort are now being reviewed. Secure your place among the leaders of international law.</p>
        <Link href="/register">
          <button className="bg-landing-surface text-landing-primary px-8 sm:px-12 lg:px-14 py-4 sm:py-6 rounded-DEFAULT font-label uppercase tracking-[0.3em] text-sm hover:bg-landing-background transition-all shadow-xl active:scale-95">
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

