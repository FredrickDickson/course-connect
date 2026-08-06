import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import cimaLogo from "/images/logo.jpeg";
import FinalCTASection from "./FinalCTASection";
import { Gavel, Users, Globe, Star } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users away from landing page
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "instructor") {
        setLocation("/instructor");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);
  // SF Pro fonts are loaded via CSS @font-face
  // useEffect(() => {
  //   // Inject fonts dynamically - REMOVED
  //   const fontLink = document.createElement('link');
  //   fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&family=Work+Sans:wght@400;500&display=swap';
  //   fontLink.rel = 'stylesheet';
  //   document.head.appendChild(fontLink);
  //   
  //   const iconLink = document.createElement('link');
  //   iconLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
  //   iconLink.rel = 'stylesheet';
  //   document.head.appendChild(iconLink);

  //   return () => {
  //     // Optional cleanup
  //   };
  // }, []);

  return (
    <div className="bg-[#faf9f6] text-[#2c2015] font-sf-pro-text selection:bg-[#8b0000]/10 selection:text-[#610000] min-h-screen">
      {/* Premium Navigation - Enhanced Mobile Experience */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#d4c5b0]/20 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto">
          <nav className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-12">
            {/* Logo - Optimized for Mobile */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-all duration-300 group">
              <img 
                src={cimaLogo} 
                alt="CIMA Logo" 
                className="h-10 sm:h-11 w-auto transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col leading-none">
                <span className="text-base sm:text-lg font-bold text-[#610000] font-sf-pro-display tracking-tight">CIMA</span>
                <span className="text-base sm:text-lg font-bold text-[#610000] font-sf-pro-display tracking-tight">Learn</span>
              </div>
            </Link>
            
            {/* Center Navigation Links - Desktop Only */}
            <div className="hidden md:flex items-center space-x-10">
              <Link href="/courses">
                <button className="text-sm font-semibold text-[#4a3828] hover:text-[#610000] transition-colors duration-300 relative group">
                  Courses
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#610000] transition-all duration-300 group-hover:w-full"></span>
                </button>
              </Link>
              <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
                <button className="text-sm font-semibold text-[#4a3828] hover:text-[#610000] transition-colors duration-300 relative group">
                  Pathways
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#610000] transition-all duration-300 group-hover:w-full"></span>
                </button>
              </a>
              <Link href="/contact">
                <button className="text-sm font-semibold text-[#4a3828] hover:text-[#610000] transition-colors duration-300 relative group">
                  Contact
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#610000] transition-all duration-300 group-hover:w-full"></span>
                </button>
              </Link>
            </div>
            
            {/* Right Side - CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login">
                <button className="hidden sm:block text-sm font-semibold text-[#4a3828] hover:text-[#610000] transition-colors duration-300 px-4 sm:px-6 py-2.5">
                  Member Portal
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-[#610000] hover:bg-[#8b0000] text-white text-xs sm:text-sm font-bold px-4 sm:px-7 py-2.5 sm:py-3 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                  Get Started
                </button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        {/* Premium Hero Section - Mobile Optimized Spacing */}
        <section className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-12 overflow-hidden pt-6 sm:pt-8 lg:pt-0 pb-8">
          {/* Elegant Background with Enhanced Depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#faf9f6] via-[#f5f3ed] to-[#f0ede4]"></div>
          
          {/* Refined Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #610000 1.5px, transparent 0)',
            backgroundSize: '48px 48px'
          }}></div>

          {/* Enhanced Decorative Elements */}
          <div className="absolute top-1/4 -right-80 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#8b6f47]/12 to-transparent blur-3xl animate-pulse" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-1/4 -left-80 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#610000]/8 to-transparent blur-3xl animate-pulse" style={{animationDuration: '10s', animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#8b6f47]/5 to-transparent blur-3xl"></div>

          <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            {/* Left: Content - Enhanced Typography with Better Contrast */}
            <div className="lg:col-span-6 space-y-6">
              {/* Overline Badge - Refined */}
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 backdrop-blur-sm border border-[#8b6f47]/30 shadow-[0_4px_20px_rgba(139,111,71,0.12)] animate-fade-in hover:shadow-[0_6px_24px_rgba(139,111,71,0.16)] transition-all duration-500">
                <div className="w-2 h-2 rounded-full bg-[#8b6f47] animate-pulse"></div>
                <span className="font-sf-pro-text text-xs font-bold tracking-[0.04em] text-[#610000]">
                  Center for International Mediators & Arbitrators
                </span>
              </div>

              {/* Hero Headline - Enhanced Hierarchy with Better Contrast */}
              <div className="space-y-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
                <h1 className="font-sf-pro-display text-[2.75rem] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] leading-[0.95] text-[#610000] tracking-[-0.025em] font-bold">
                  The Definitive Standard in{" "}
                  <span className="block mt-2 font-light italic text-[#8b0000] relative">
                    Self-Paced Learning
                    <span className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-[#8b6f47] to-transparent rounded-full"></span>
                  </span>
                </h1>
              </div>

              {/* Description - Improved Readability with Darker Text */}
              <p className="font-sf-pro-text text-lg text-[#2c2015] leading-[1.7] max-w-2xl animate-fade-in font-normal" style={{animationDelay: '0.2s'}}>
                Join a global cadre of legal elite. Elevate your practice through rigorous ADR training and certifications recognized by the world's leading arbitral institutions.
              </p>

              {/* CTA Buttons - Enhanced Interaction */}
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{animationDelay: '0.3s'}}>
                <Link href="/courses">
                  <button className="group relative bg-gradient-to-br from-[#610000] to-[#8b0000] text-white px-8 py-4 rounded-2xl font-sf-pro-text font-bold text-base tracking-wide overflow-hidden hover:shadow-[0_20px_48px_rgba(97,0,0,0.28)] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8b0000] to-[#610000] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Browse Courses
                      <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </button>
                </Link>
                <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
                  <button className="group relative bg-white border-2 border-[#610000]/30 text-[#610000] px-8 py-4 rounded-2xl font-sf-pro-text font-bold text-base tracking-wide hover:border-[#610000]/50 hover:shadow-[0_12px_36px_rgba(97,0,0,0.15)] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm bg-white/95">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Explore Pathways
                      <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </button>
                </a>
              </div>

              {/* Trust Metrics - Enhanced Visual Weight with Better Contrast */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-[#d4c5b0]/50 animate-fade-in" style={{animationDelay: '0.4s'}}>
                <div className="flex items-center gap-3 group cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-[#8b6f47]/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#8b6f47]/30">
                    <Star className="w-6 h-6 text-[#8b6f47] fill-[#8b6f47]" />
                  </div>
                  <div>
                    <div className="text-2xl font-sf-pro-display font-bold text-[#610000]">4.9</div>
                    <div className="text-xs font-sf-pro-text text-[#4a3828] font-semibold">Average Rating</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 group cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-[#8b6f47]/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#8b6f47]/30">
                    <Users className="w-6 h-6 text-[#8b6f47]" />
                  </div>
                  <div>
                    <div className="text-2xl font-sf-pro-display font-bold text-[#610000]">4,800+</div>
                    <div className="text-xs font-sf-pro-text text-[#4a3828] font-semibold">Active Members</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 group cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-[#8b6f47]/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#8b6f47]/30">
                    <Globe className="w-6 h-6 text-[#8b6f47]" />
                  </div>
                  <div>
                    <div className="text-2xl font-sf-pro-display font-bold text-[#610000]">38</div>
                    <div className="text-xs font-sf-pro-text text-[#4a3828] font-semibold">Jurisdictions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Premium Image - Optimized Height */}
            <div className="lg:col-span-6 relative animate-fade-in" style={{animationDelay: '0.2s'}}>
              {/* Enhanced Decorative Frame */}
              <div className="absolute -inset-6 bg-gradient-to-br from-[#8b6f47]/12 to-[#610000]/8 rounded-[36px] blur-3xl animate-pulse" style={{animationDuration: '6s'}}></div>
              
              {/* Main Image Container - Reduced Height for Above Fold */}
              <div className="relative h-[450px] lg:h-[500px] rounded-[32px] overflow-hidden shadow-[0_32px_80px_rgba(97,0,0,0.18)] border-2 border-white/60 group">
                {/* Enhanced Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#610000]/8 via-transparent to-[#8b6f47]/8"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#2c2015]/30 via-transparent to-transparent"></div>
                
                <img 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110" 
                  alt="Modern law library with legal professionals studying international arbitration and ADR materials" 
                  src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&auto=format&fit=crop&q=80" 
                />
                
                {/* Enhanced Bottom Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>
                
                {/* Decorative Corner Elements */}
                <div className="absolute top-6 left-6 w-24 h-24 border-t-2 border-l-2 border-white/30 rounded-tl-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute bottom-6 right-6 w-24 h-24 border-b-2 border-r-2 border-white/30 rounded-br-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </div>

              {/* Enhanced Floating Credential Badge - Improved Contrast */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-[24px] shadow-[0_20px_60px_rgba(97,0,0,0,0.24)] border-2 border-[#d4c5b0]/30 p-6 hidden lg:block hover:scale-105 transition-transform duration-500 cursor-default">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-500">
                    <Star className="w-8 h-8 text-white fill-white" />
                  </div>
                  <div>
                    <div className="text-lg font-sf-pro-display font-bold text-[#610000] mb-1">ICC Recognized</div>
                    <div className="text-xs font-sf-pro-text text-[#4a3828] font-bold">Global Certification</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators Bar - Enhanced Visual Authority */}
        <section className="py-20 px-6 lg:px-12 border-y border-[#d4c5b0]/20 bg-gradient-to-b from-white to-[#faf9f6]">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-16 lg:gap-24">
              <div className="text-center group cursor-default">
                <div className="text-5xl font-sf-pro-display font-bold text-[#610000] mb-3 group-hover:scale-110 transition-transform duration-500">ICC</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f] font-semibold uppercase tracking-wider">Recognized</div>
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-[#d4c5b0] to-transparent hidden lg:block"></div>
              <div className="text-center group cursor-default">
                <div className="text-5xl font-sf-pro-display font-bold text-[#610000] mb-3 group-hover:scale-110 transition-transform duration-500">LCIA</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f] font-semibold uppercase tracking-wider">Accredited</div>
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-[#d4c5b0] to-transparent hidden lg:block"></div>
              <div className="text-center group cursor-default">
                <div className="text-5xl font-sf-pro-display font-bold text-[#610000] mb-3 group-hover:scale-110 transition-transform duration-500">SIAC</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f] font-semibold uppercase tracking-wider">Certified</div>
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-[#d4c5b0] to-transparent hidden lg:block"></div>
              <div className="text-center group cursor-default">
                <div className="text-5xl font-sf-pro-display font-bold text-[#610000] mb-3 group-hover:scale-110 transition-transform duration-500">RIAC</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f] font-semibold uppercase tracking-wider">Partner</div>
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-[#d4c5b0] to-transparent hidden lg:block"></div>
              <div className="text-center group cursor-default">
                <div className="text-5xl font-sf-pro-display font-bold text-[#610000] mb-3 group-hover:scale-110 transition-transform duration-500">CIArb</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f] font-semibold uppercase tracking-wider">Approved</div>
              </div>
            </div>
          </div>
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

      {/* Footer - Enhanced Premium Design */}
      <footer className="bg-gradient-to-b from-[#faf9f6] via-[#f5f3ed] to-[#f0ede4] border-t-2 border-[#d4c5b0]/40 w-full py-24 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-20 mb-24">
            {/* Left Column - Enhanced Branding */}
            <div className="lg:col-span-2 space-y-10">
              <div className="flex items-center space-x-4 group cursor-default">
                <img 
                  src={cimaLogo} 
                  alt="CIMA Logo" 
                  className="h-16 w-auto transition-transform duration-500 group-hover:scale-105"
                />
                <div>
                  <h1 className="text-2xl font-bold text-[#610000] font-sf-pro-display tracking-tight">CIMA Learn</h1>
                  <p className="text-xs text-[#8b6f47] font-sf-pro-text tracking-wide uppercase font-bold">Professional ADR Education</p>
                </div>
              </div>
              <p className="font-sf-pro-text text-xl text-[#4a3828] leading-relaxed max-w-md">
                Center for International Mediators and Arbitrators - Leading global alternative dispute resolution education and certification.
              </p>
              
              {/* Enhanced Trust Badges */}
              <div className="flex flex-wrap items-center gap-5 pt-6">
                <div className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border-2 border-[#d4c5b0]/40 shadow-sm hover:shadow-md hover:border-[#8b6f47]/50 transition-all duration-500">
                  <Gavel className="w-6 h-6 text-[#610000]" />
                  <span className="text-sm font-sf-pro-text font-bold text-[#610000]">ICC Recognized</span>
                </div>
                <div className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border-2 border-[#d4c5b0]/40 shadow-sm hover:shadow-md hover:border-[#8b6f47]/50 transition-all duration-500">
                  <Globe className="w-6 h-6 text-[#610000]" />
                  <span className="text-sm font-sf-pro-text font-bold text-[#610000]">38 Jurisdictions</span>
                </div>
              </div>
            </div>

            {/* Middle Column - Enhanced Quick Links */}
            <div className="space-y-7">
              <h3 className="font-sf-pro-display text-base font-bold text-[#610000] uppercase tracking-wider">Quick Links</h3>
              <div className="flex flex-col space-y-5 font-sf-pro-text text-base">
                <Link href="/privacy-policy" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Terms of Service
                </Link>
                <Link href="/contact" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Contact Us
                </Link>
                <Link href="/help-center" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Help Center
                </Link>
              </div>
            </div>

            {/* Right Column - Enhanced Additional Links */}
            <div className="space-y-7">
              <h3 className="font-sf-pro-display text-base font-bold text-[#610000] uppercase tracking-wider">For Professionals</h3>
              <div className="flex flex-col space-y-5 font-sf-pro-text text-base">
                <Link href="/become-instructor" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Become an Instructor
                </Link>
                <Link href="/courses" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Browse Courses
                </Link>
                <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer" className="text-[#4a3828] hover:text-[#610000] transition-colors duration-500 flex items-center gap-3 group">
                  <span className="w-0 group-hover:w-4 h-[2px] bg-[#8b6f47] transition-all duration-500"></span>
                  Qualification Pathways
                </a>
              </div>
            </div>
          </div>

          {/* Enhanced Bottom Bar - Copyright */}
          <div className="border-t-2 border-[#d4c5b0]/40 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="font-sf-pro-text text-base text-[#6b5d4f]">
                © {new Date().getFullYear()} CIMA LEARN. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-base text-[#6b5d4f] font-sf-pro-text">
                <span>Designed with</span>
                <span className="text-[#8b6f47] text-2xl">♦</span>
                <span>for legal professionals worldwide</span>
              </div>
            </div>
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
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header - Enhanced Typography */}
        <div className="max-w-5xl mb-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-20 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.15em] text-[#8b6f47]">
              Qualification Pathway
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-12 leading-[1.05] tracking-tight font-bold">
            A journey of mastery from foundational principles to elite international certification.
          </h2>
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed font-light">
            Three progressive stages designed to elevate your professional standing in the global ADR community.
          </p>
        </div>
        
        {/* Pathway Cards - Enhanced Visual Design */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Card 1: Associate - Refined */}
          <div className="group bg-white rounded-[28px] border-2 border-[#d4c5b0]/40 p-12 hover:border-[#8b6f47]/50 hover:shadow-[0_28px_72px_rgba(97,0,0,0.14)] hover:-translate-y-3 transition-all duration-700 relative overflow-hidden">
            {/* Enhanced Number Badge */}
            <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-[#faf9f6] to-white border-2 border-[#d4c5b0]/40 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-700">
              <span className="font-sf-pro-display text-3xl font-bold text-[#8b6f47]">I</span>
            </div>
            
            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 mb-10 px-5 py-3 rounded-full bg-[#8b6f47]/8 border-2 border-[#8b6f47]/25">
              <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.15em] text-[#8b6f47]">
                Part I
              </span>
            </div>
            
            {/* Title */}
            <h3 className="font-sf-pro-display text-3xl text-[#610000] mb-7 leading-tight group-hover:translate-x-1 transition-transform duration-700 font-bold">
              The Gateway to Distinction
            </h3>
            
            {/* Subtitle */}
            <div className="font-sf-pro-text text-lg font-bold text-[#8b6f47] mb-7">
              Associate Member
            </div>
            
            {/* Description */}
            <p className="font-sf-pro-text text-[#4a3828] leading-relaxed text-base mb-12">
              Establish your foundation within the international ADR landscape. Designed for professionals seeking to bridge the gap between local practice and global standards.
            </p>
            
            {/* Enhanced Bottom Accent */}
            <div className="h-1 w-28 bg-gradient-to-r from-[#8b6f47] to-transparent rounded-full opacity-50 group-hover:opacity-100 group-hover:w-48 transition-all duration-700"></div>
          </div>
          
          {/* Card 2: Member - Refined */}
          <div className="group bg-white rounded-[28px] border-2 border-[#d4c5b0]/40 p-12 hover:border-[#8b6f47]/50 hover:shadow-[0_28px_72px_rgba(97,0,0,0.14)] hover:-translate-y-3 transition-all duration-700 relative overflow-hidden">
            {/* Enhanced Number Badge */}
            <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-[#faf9f6] to-white border-2 border-[#d4c5b0]/40 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-700">
              <span className="font-sf-pro-display text-3xl font-bold text-[#8b6f47]">II</span>
            </div>
            
            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 mb-10 px-5 py-3 rounded-full bg-[#8b6f47]/8 border-2 border-[#8b6f47]/25">
              <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.15em] text-[#8b6f47]">
                Part II
              </span>
            </div>
            
            {/* Title */}
            <h3 className="font-sf-pro-display text-3xl text-[#610000] mb-7 leading-tight group-hover:translate-x-1 transition-transform duration-700 font-bold">
              Strategic Mastery
            </h3>
            
            {/* Subtitle */}
            <div className="font-sf-pro-text text-lg font-bold text-[#8b6f47] mb-7">
              Full Member
            </div>
            
            {/* Description */}
            <p className="font-sf-pro-text text-[#4a3828] leading-relaxed text-base mb-12">
              Refine your expertise in the complexities of cross-border dispute resolution. For practitioners ready to navigate high-stakes international mediation and arbitration law.
            </p>
            
            {/* Enhanced Bottom Accent */}
            <div className="h-1 w-28 bg-gradient-to-r from-[#8b6f47] to-transparent rounded-full opacity-50 group-hover:opacity-100 group-hover:w-48 transition-all duration-700"></div>
          </div>
          
          {/* Card 3: Fellow - Maximum Contrast for Visibility */}
          <div className="group bg-gradient-to-br from-[#610000] to-[#8b0000] rounded-[28px] border-2 border-[#610000] p-12 hover:shadow-[0_32px_80px_rgba(97,0,0,0.36)] hover:scale-[1.03] transition-all duration-700 relative overflow-hidden">
            {/* Enhanced Premium Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-br from-[#8b6f47] to-[#9f7d4f] text-white px-6 py-3 text-[10px] font-sf-pro-text uppercase tracking-[0.15em] font-bold rounded-bl-[24px] flex items-center gap-2 shadow-lg">
              <Star className="w-4 h-4 fill-current" />
              Most Prestigious
            </div>
            
            {/* Enhanced Number Badge */}
            <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-white/25 backdrop-blur-xl flex items-center justify-center border-2 border-white/50 shadow-lg group-hover:scale-110 transition-transform duration-700">
              <span className="font-sf-pro-display text-3xl font-bold text-white">III</span>
            </div>
            
            {/* Level Badge */}
            <div className="inline-flex items-center gap-2 mb-10 px-5 py-3 rounded-full bg-white/25 backdrop-blur-xl border-2 border-white/50">
              <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.15em] text-white">
                Part III
              </span>
            </div>
            
            {/* Title - Pure White */}
            <h3 className="font-sf-pro-display text-3xl text-white mb-7 leading-tight group-hover:translate-x-1 transition-transform duration-700 font-bold">
              The Pinnacle of Practice
            </h3>
            
            {/* Subtitle - Bright Gold */}
            <div className="font-sf-pro-text text-lg font-bold text-[#ffd700] mb-7">
              Fellow (FCIMArb)
            </div>
            
            {/* Description - Maximum Contrast White with Shadow */}
            <p className="font-sf-pro-text text-white leading-relaxed text-base mb-12 [text-shadow:_0_1px_3px_rgb(0_0_0_/_40%)]">
              Our most prestigious designation. Reserved for those who have achieved absolute mastery in award writing and legal scholarship. The ultimate mark of a global expert.
            </p>
            
            {/* Enhanced Icon Grid - Bright Gold */}
            <div className="flex items-center gap-5">
              <Star className="w-8 h-8 text-[#ffd700] fill-[#ffd700]" />
              <Star className="w-8 h-8 text-[#ffd700] fill-[#ffd700]" />
              <Star className="w-8 h-8 text-[#ffd700] fill-[#ffd700]" />
            </div>
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
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-[#faf9f6] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Image Container with Enhanced Premium Treatment and Maximum Text Visibility */}
        <div className="relative w-full h-[650px] lg:h-[850px] overflow-hidden rounded-[36px] group">
          {/* Main Image */}
          <img 
            className="w-full h-full object-cover object-center transition-transform duration-[3000ms] group-hover:scale-110" 
            data-alt="a majestic private law library with floor-to-ceiling dark wood bookshelves, a green banker's lamp, and leather-bound journals" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMNUEcqXIG_64n8Tn7z_HvuBVn4dYFDUCtWuwomlbyTZXwOe9f2SbTPxXgS0mQuCzEQxoanUBgfFQN1ubW4fCw8is97I_jVjLoUUb4wX8HX01SOhhJMWC_W1AXAFK3Drev8Ct6dfMtX2wUq2uzk6v8X8My5a5Su69A5geI0FN0QafBNrOG6EdUfY1HY1Ow032Rt_lp7X7Wm4YonxjosIStgP8ZQO9EwnS_gIefzX9el_hA3orSv_xu459_8bpE-DrVvOuTP_WwMag"
          />
          
          {/* Enhanced Gradient Overlays for Better Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent mix-blend-multiply"></div>
          
          {/* Content Overlay with Enhanced Spacing */}
          <div className="absolute inset-0 flex items-end justify-start p-14 lg:p-24">
            <div className="max-w-5xl space-y-10">
              {/* Enhanced Badge with Solid Background */}
              <div className="inline-flex items-center gap-3 mb-8 px-6 py-4 rounded-full bg-white/95 backdrop-blur-xl border-2 border-white/50 hover:bg-white transition-all duration-500">
                <Gavel className="w-6 h-6 text-[#610000]" />
                <span className="font-sf-pro-text text-sm font-bold uppercase tracking-[0.1em] text-[#610000]">
                  The CIMA Advantage
                </span>
              </div>
              
              {/* Enhanced Heading - Pure White with Text Shadow */}
              <h2 className="font-sf-pro-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-white mb-10 leading-[1.05] tracking-tight font-bold [text-shadow:_0_2px_8px_rgb(0_0_0_/_60%)]">
                Unparalleled Pedigree
              </h2>
              
              {/* Enhanced Description - Pure White with Shadow */}
              <p className="font-sf-pro-text text-2xl lg:text-3xl text-white leading-relaxed max-w-4xl font-light [text-shadow:_0_2px_8px_rgb(0_0_0_/_60%)]">
                Built on decades of excellence in international dispute resolution. Our programs represent the gold standard in alternative dispute resolution education worldwide.
              </p>
            </div>
          </div>
          
          {/* Enhanced Decorative Corner Elements */}
          <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-white/30 rounded-tl-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-white/30 rounded-br-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
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
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-gradient-to-b from-[#faf9f6] to-white border-y-2 border-[#d4c5b0]/25 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header - Enhanced */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-20 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.15em] text-[#8b6f47]">
              Excellence Recognized
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-12 leading-[1.05] tracking-tight font-bold">
            Trusted by legal elites worldwide
          </h2>
        </div>
        
        {/* Testimonials Grid - Enhanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Testimonial 1 - Enhanced */}
          <div className="relative group bg-white border-2 border-[#d4c5b0]/40 rounded-[32px] p-14 hover:border-[#8b6f47]/50 hover:shadow-[0_28px_72px_rgba(97,0,0,0.14)] hover:-translate-y-3 transition-all duration-700">
            {/* Enhanced Quote Mark */}
            <div className="absolute -top-8 -left-8">
              <svg className="w-28 h-28 text-[#8b6f47]/10 transform -rotate-12 group-hover:scale-110 transition-transform duration-700" fill="currentColor" viewBox="0 0 32 32">
                <path d="M10 8c-3.3 0-6 2.7-6 6v10h8V14h-4c0-2.2 1.8-4 4-4V8zm14 0c-3.3 0-6 2.7-6 6v10h8V14h-4c0-2.2 1.8-4 4-4V8z"/>
              </svg>
            </div>
            
            <blockquote className="relative">
              {/* Enhanced Quote Content */}
              <p className="font-sf-pro-display text-2xl lg:text-3xl text-[#610000] mb-14 leading-[1.4] tracking-tight font-light">
                The CIMA curriculum offers a depth of intellectual rigor that is simply unparalleled. It was the catalyst for my elevation to the international arbitral tribunal.
              </p>
              
              {/* Enhanced Author Info */}
              <cite className="not-italic flex items-start gap-6 pt-10 border-t-2 border-[#d4c5b0]/40">
                {/* Enhanced Avatar */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-700">
                  <span className="text-white font-sf-pro-display font-bold text-3xl">MT</span>
                </div>
                
                <div className="flex-1">
                  <span className="block font-sf-pro-display text-xl font-bold text-[#610000] mb-2">
                    Mohammed Talib
                  </span>
                  <span className="block font-sf-pro-text text-base text-[#6b5d4f] mb-5">
                    Partner, Pinsent Masons, Hong Kong
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#8b6f47]/10 text-xs font-sf-pro-text font-bold uppercase tracking-wider text-[#610000] border border-[#8b6f47]/20">
                      FCIArb
                    </span>
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#8b6f47]/10 text-xs font-sf-pro-text font-bold uppercase tracking-wider text-[#610000] border border-[#8b6f47]/20">
                      FCIMArb
                    </span>
                  </div>
                </div>
              </cite>
              
              {/* Enhanced Decorative Line */}
              <div className="absolute bottom-0 left-0 h-1 w-36 bg-gradient-to-r from-[#8b6f47] to-transparent rounded-full opacity-50 group-hover:opacity-100 group-hover:w-56 transition-all duration-700"></div>
            </blockquote>
          </div>
          
          {/* Testimonial 2 - Enhanced */}
          <div className="relative group bg-white border-2 border-[#d4c5b0]/40 rounded-[32px] p-14 hover:border-[#8b6f47]/50 hover:shadow-[0_28px_72px_rgba(97,0,0,0.14)] hover:-translate-y-3 transition-all duration-700">
            {/* Enhanced Quote Mark */}
            <div className="absolute -top-8 -left-8">
              <svg className="w-28 h-28 text-[#8b6f47]/10 transform -rotate-12 group-hover:scale-110 transition-transform duration-700" fill="currentColor" viewBox="0 0 32 32">
                <path d="M10 8c-3.3 0-6 2.7-6 6v10h8V14h-4c0-2.2 1.8-4 4-4V8zm14 0c-3.3 0-6 2.7-6 6v10h8V14h-4c0-2.2 1.8-4 4-4V8z"/>
              </svg>
            </div>
            
            <blockquote className="relative">
              {/* Enhanced Quote Content */}
              <p className="font-sf-pro-display text-2xl lg:text-3xl text-[#610000] mb-14 leading-[1.4] tracking-tight font-light">
                A sophisticated program that masterfully bridges the gap between theoretical jurisprudence and high-stakes practical application. Truly world-class.
              </p>
              
              {/* Enhanced Author Info */}
              <cite className="not-italic flex items-start gap-6 pt-10 border-t-2 border-[#d4c5b0]/40">
                {/* Enhanced Avatar */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-700">
                  <span className="text-white font-sf-pro-display font-bold text-3xl">IS</span>
                </div>
                
                <div className="flex-1">
                  <span className="block font-sf-pro-display text-xl font-bold text-[#610000] mb-2">
                    Iain Sharp
                  </span>
                  <span className="block font-sf-pro-text text-base text-[#6b5d4f] mb-5">
                    Partner, Hill Dickinson
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#8b6f47]/10 text-xs font-sf-pro-text font-bold uppercase tracking-wider text-[#610000] border border-[#8b6f47]/20">
                      FCIArb
                    </span>
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#8b6f47]/10 text-xs font-sf-pro-text font-bold uppercase tracking-wider text-[#610000] border border-[#8b6f47]/20">
                      FCIMArb
                    </span>
                  </div>
                </div>
              </cite>
              
              {/* Enhanced Decorative Line */}
              <div className="absolute bottom-0 left-0 h-1 w-36 bg-gradient-to-r from-[#8b6f47] to-transparent rounded-full opacity-50 group-hover:opacity-100 group-hover:w-56 transition-all duration-700"></div>
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
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-[#faf9f6] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <style>
        {`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
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
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              Institutional network
            </span>
            <div className="w-16 h-[2px] bg-gradient-to-l from-[#8b6f47] to-transparent"></div>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            Trusted by Leading Institutions
          </h2>
          
          {/* Logo Carousel */}
          <div className="relative overflow-hidden bg-white rounded-[28px] border-2 border-[#d4c5b0]/30 py-16 px-8">
            <div 
              className="flex items-center gap-16 lg:gap-24 animate-scroll"
              style={{
                animation: 'scroll 20s linear infinite',
                width: 'max-content'
              }}
            >
              {/* First set of logos */}
              {PARTNER_LOGOS.map((partner, index) => (
                <div key={`original-${partner.name}`} className="flex flex-col items-center gap-4 min-w-fit flex-shrink-0 group">
                  <img 
                    alt={`${partner.name} Logo`} 
                    className="h-20 lg:h-24 logo-tint opacity-50 group-hover:opacity-100 transition-opacity duration-500 object-contain w-auto max-w-[200px]" 
                    src={partner.url}
                    onError={(e) => {
                      console.log(`Failed to load logo for ${partner.name}:`, partner.url);
                      const target = e.target as HTMLImageElement;
                      target.style.border = '2px solid red';
                      target.alt = `FAILED: ${partner.name}`;
                    }}
                  />
                  <span className="text-xs text-[#6b5d4f] font-sf-pro-text uppercase tracking-wider text-center max-w-[180px]">
                    {partner.name}
                  </span>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {PARTNER_LOGOS.map((partner, index) => (
                <div key={`duplicate-${partner.name}`} className="flex flex-col items-center gap-4 min-w-fit flex-shrink-0 group">
                  <img 
                    alt={`${partner.name} Logo`} 
                    className="h-20 lg:h-24 logo-tint opacity-50 group-hover:opacity-100 transition-opacity duration-500 object-contain w-auto max-w-[200px]" 
                    src={partner.url}
                    onError={(e) => {
                      console.log(`Failed to load duplicate logo for ${partner.name}:`, partner.url);
                      const target = e.target as HTMLImageElement;
                      target.style.border = '2px solid red';
                      target.alt = `FAILED: ${partner.name}`;
                    }}
                  />
                  <span className="text-xs text-[#6b5d4f] font-sf-pro-text uppercase tracking-wider text-center max-w-[180px]">
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

// Student Reviews Section
function StudentReviewsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const testimonials = [
    {
      author: "Sarah Chen",
      role: "FCIArb, International Arbitrator",
      location: "Singapore",
      content: "The CIMA certification opened doors to opportunities I never imagined. The curriculum is rigorous but incredibly rewarding.",
      rating: 5,
      initials: "SC",
      gradient: "from-[#610000] to-[#8b0000]"
    },
    {
      author: "Michael Rodriguez",
      role: "FCIMArb, Mediation Expert",
      location: "Madrid",
      content: "The practical skills and theoretical knowledge gained through CIMA's programs have been invaluable to my practice.",
      rating: 5,
      initials: "MR",
      gradient: "from-[#610000] to-[#8b0000]"
    },
    {
      author: "Amara Okonkwo",
      role: "Associate Member",
      location: "Lagos, Nigeria",
      content: "CIMA's approach to ADR training is comprehensive and globally recognized. Highly recommend!",
      rating: 5,
      initials: "AO",
      gradient: "from-[#610000] to-[#8b0000]"
    }
  ];

  return (
    <section 
      ref={ref}
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-[#faf9f6] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              Student reviews
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            What our learners say
          </h2>
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed max-w-3xl font-light">
            Real experiences from professionals who transformed their careers through CIMA.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="group bg-white border-2 border-[#d4c5b0]/30 rounded-[24px] overflow-hidden hover:border-[#8b6f47]/40 hover:shadow-[0_24px_64px_rgba(97,0,0,0.12)] hover:-translate-y-2 transition-all duration-700"
            >
              {/* Header with Avatar */}
              <div className="p-10 pb-8">
                <div className="flex items-start gap-5 mb-8">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-700`}>
                    <span className="text-white font-sf-pro-display font-bold text-2xl">{t.initials}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-sf-pro-display text-xl font-bold text-[#610000] mb-2">{t.author}</div>
                    <div className="flex items-center gap-1.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-[#8b6f47] fill-[#8b6f47]" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <p className="font-sf-pro-text text-base text-[#4a3828] leading-relaxed mb-8">
                  "{t.content}"
                </p>
              </div>

              {/* Author Details - Footer */}
              <div className="px-10 py-6 border-t-2 border-[#d4c5b0]/30 bg-[#faf9f6]">
                <div className="font-sf-pro-text text-sm font-bold text-[#8b6f47] mb-1">{t.role}</div>
                <div className="font-sf-pro-text text-sm text-[#6b5d4f]">{t.location}</div>
              </div>
            </div>
          ))}
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
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-gradient-to-b from-white to-[#faf9f6] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
              <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
                Strategic Partnership
              </span>
            </div>
            <h2 className="font-sf-pro-display text-4xl lg:text-5xl xl:text-6xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
              In Partnership with Bar Associations and Arbitral Bodies
            </h2>
            <p className="font-sf-pro-text text-xl text-[#4a3828] leading-relaxed mb-8">
              CIMA is pleased to support Russian International Arbitration Congress 2026, a leading global forum for arbitration practitioners.
            </p>
            <p className="font-sf-pro-text text-xl text-[#4a3828] leading-relaxed">
              This underscores our commitment to advancing best practice in Eastern Europe.
            </p>
          </div>
          
          {/* Right: RIAC Logo */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8b6f47]/10 to-[#610000]/5 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="relative bg-white border-2 border-[#d4c5b0]/30 rounded-[28px] p-16 hover:border-[#8b6f47]/40 hover:shadow-[0_24px_64px_rgba(97,0,0,0.12)] transition-all duration-700">
                <img 
                  src="/images/institutions/riac-logo.png"
                  alt="Russian International Arbitration Centre Logo"
                  className="h-32 lg:h-40 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// NEW SECTION 4: Global Institutional Engagement
function GlobalInstitutionalEngagementSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-gradient-to-b from-white to-[#faf9f6] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="text-left max-w-4xl mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              International presence
            </span>
          </div>
          <h2 className="font-sf-pro-display text-4xl lg:text-5xl xl:text-6xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            Global Institutional Engagement
          </h2>
          <p className="font-sf-pro-text text-xl text-[#4a3828] leading-relaxed">
            Our Mediators and Arbitrators maintain active professional engagements with leading arbitral and mediation institutions across the world. Through these affiliations, CIMA members operate at the forefront of international dispute resolution.
          </p>
        </div>
        <div className="space-y-20 lg:space-y-28">
          {/* Primary Institutions */}
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {INSTITUTION_LOGOS.slice(0, 10).map((institution, index) => (
                <div key={`primary-${index}`} className="group flex flex-col items-center justify-center p-8 border-2 border-[#d4c5b0]/30 bg-white hover:bg-[#faf9f6] hover:border-[#8b6f47]/40 hover:shadow-[0_16px_40px_rgba(97,0,0,0.08)] transition-all duration-700 hover:-translate-y-1 text-center min-h-[220px] rounded-[20px]">
                  <div className="w-24 h-24 mb-6 flex items-center justify-center">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.acronym} Logo`}
                      className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                    />
                  </div>
                  <p className="font-sf-pro-text text-sm text-[#4a3828] leading-relaxed">{institution.name}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Specialised & Regional ADR Institutions */}
          <div>
            <h3 className="font-sf-pro-display text-3xl lg:text-4xl text-[#610000] mb-12 tracking-tight font-bold">Specialised & Regional ADR Institutions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {INSTITUTION_LOGOS.slice(10, 18).map((institution, index) => (
                <div key={`regional-${index}`} className="group flex flex-col items-center justify-center p-8 border-2 border-[#d4c5b0]/30 bg-white hover:bg-[#faf9f6] hover:border-[#8b6f47]/40 hover:shadow-[0_16px_40px_rgba(97,0,0,0.08)] transition-all duration-700 hover:-translate-y-1 text-center min-h-[220px] rounded-[20px]">
                  <div className="w-24 h-24 mb-6 flex items-center justify-center">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.acronym} Logo`}
                      className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                    />
                  </div>
                  <p className="font-sf-pro-text text-sm text-[#4a3828] leading-relaxed">{institution.name}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Mediation & Hybrid Dispute Resolution Bodies */}
          <div>
            <h3 className="font-sf-pro-display text-3xl lg:text-4xl text-[#610000] mb-12 tracking-tight font-bold">Mediation & Hybrid Dispute Resolution Bodies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {INSTITUTION_LOGOS.slice(18, 20).map((institution, index) => (
                <div key={`mediation-${index}`} className="group flex flex-col items-center justify-center p-8 border-2 border-[#d4c5b0]/30 bg-white hover:bg-[#faf9f6] hover:border-[#8b6f47]/40 hover:shadow-[0_16px_40px_rgba(97,0,0,0.08)] transition-all duration-700 hover:-translate-y-1 text-center min-h-[220px] rounded-[20px]">
                  <div className="w-24 h-24 mb-6 flex items-center justify-center">
                    <img 
                      src={institution.logo} 
                      alt={`${institution.acronym} Logo`}
                      className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                    />
                  </div>
                  <p className="font-sf-pro-text text-sm text-[#4a3828] leading-relaxed">{institution.name}</p>
                </div>
              ))}
            </div>
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
    { name: "International Arbitration", count: "12 courses", icon: "gavel" },
    { name: "Mediation & Conciliation", count: "9 courses", icon: "handshake" },
    { name: "Investor-State Disputes", count: "10 courses", icon: "public" },
    { name: "ADR Certification Prep", count: "8 courses", icon: "verified" },
    { name: "Contract Drafting", count: "7 courses", icon: "description" },
    { name: "Emergency Proceedings", count: "5 courses", icon: "timer" },
  ];

  return (
    <section
      ref={ref}
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              Browse by category
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            Learning paths
          </h2>
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed max-w-3xl font-light">
            Structured tracks built for every stage of your ADR career.
          </p>
        </div>

        {/* Paths Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {learningPaths.map((path) => (
            <button
              key={path.name}
              className="group bg-white border-2 border-[#d4c5b0]/30 rounded-[24px] p-8 transition-all duration-700 hover:border-[#8b6f47]/40 hover:shadow-[0_20px_48px_rgba(97,0,0,0.12)] hover:-translate-y-2 text-left cursor-pointer"
            >
              <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-[#8b6f47]/10 to-[#8b6f47]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700 border border-[#d4c5b0]/30">
                <span className="material-symbols-outlined text-3xl text-[#8b6f47]">{path.icon}</span>
              </div>
              <h3 className="font-sf-pro-display text-lg font-bold text-[#610000] mb-3 leading-tight group-hover:text-[#8b0000] transition-colors duration-500">
                {path.name}
              </h3>
              <p className="font-sf-pro-text text-sm text-[#6b5d4f] font-medium">{path.count}</p>
            </button>
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
      badgeColor: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20",
      gradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      title: "International Commercial Arbitration: End-to-End Practice",
      category: "Arbitration",
      instructor: "Dr. Ivan Petrov, RIAC Panel",
      rating: 4.8,
      students: 976,
      modules: 8,
      hours: 24,
      level: "Part II (Member)",
      cpd: 12,
      badge: "Certificate",
      badgeColor: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20",
      gradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      title: "ISDS: Treaty Claims, BITs & ICSID Practice",
      category: "Investment Law",
      instructor: "Prof. Kwame Asante, ICJ Consultant",
      rating: 4.9,
      students: 702,
      modules: 10,
      hours: 30,
      level: "Part III (Fellow)",
      cpd: 18,
      badge: "Diploma",
      badgeColor: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20",
      gradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      title: "Drafting Enforceable Arbitration Clauses",
      category: "Drafting",
      instructor: "Ms. Sarah Okafor, Senior Counsel",
      rating: 4.7,
      students: 514,
      modules: 3,
      hours: 9,
      level: "Part I (Associate)",
      cpd: 6,
      badge: "Certificate",
      badgeColor: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20",
      gradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      title: "Emergency Arbitration: Urgent Relief in Cross-Border Disputes",
      category: "Emergency Proceedings",
      instructor: "Dr. Elena Morozova, LCIA Arbitrator",
      rating: 4.8,
      students: 389,
      modules: 4,
      hours: 12,
      level: "Part III (Fellow)",
      cpd: 8,
      badge: "New",
      badgeColor: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20",
      gradient: "from-[#610000] to-[#8b0000]"
    },
  ];

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className={`w-5 h-5 ${i < Math.floor(rating) ? 'text-[#8b6f47] fill-[#8b6f47]' : 'text-[#d4c5b0] fill-[#d4c5b0]'}`} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <section
      ref={ref}
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-20 gap-8">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
              <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
                Top rated
              </span>
            </div>
            <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
              Featured courses
            </h2>
            <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed font-light">
              Curated by our academic board. Recognized by ICC, LCIA, SIAC, RIAC and CIArb.
            </p>
          </div>
          <Link href="/courses" className="group flex items-center gap-3 font-sf-pro-text text-lg font-semibold text-[#610000] hover:text-[#8b0000] transition-colors duration-500 px-6 py-3 rounded-[14px] hover:bg-[#610000]/5">
            View all courses
            <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Courses Grid - More Compact Sizing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredCourses.map((course, index) => (
            <div
              key={course.title}
              className="group bg-white border-2 border-[#d4c5b0]/30 rounded-[24px] overflow-hidden hover:border-[#8b6f47]/40 hover:shadow-[0_24px_64px_rgba(97,0,0,0.12)] hover:-translate-y-3 transition-all duration-700 cursor-pointer"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              {/* Course Thumbnail - Reduced Height */}
              <div className={`relative h-56 flex items-center justify-center overflow-hidden bg-gradient-to-br ${course.gradient}`}>
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0, transparent 12px, rgba(255,255,255,0.05) 12px, rgba(255,255,255,0.05) 24px)'
                }}></div>
                <Gavel className="relative z-10 w-20 h-20 text-white/90 group-hover:scale-110 transition-transform duration-700" />
                
                {/* Badge */}
                <div className={`absolute top-5 right-5 px-3 py-2 rounded-full text-xs font-sf-pro-text font-bold uppercase tracking-wider border-2 backdrop-blur-sm ${course.badgeColor}`}>
                  {course.badge}
                </div>
              </div>

              {/* Course Body - More Compact */}
              <div className="p-6 space-y-4">
                <div className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
                  {course.category}
                </div>
                <h4 className="font-sf-pro-display text-xl font-bold text-[#610000] leading-tight group-hover:text-[#8b0000] transition-colors duration-500 line-clamp-2">
                  {course.title}
                </h4>
                <p className="font-sf-pro-text text-sm text-[#6b5d4f] line-clamp-1">{course.instructor}</p>

                {/* Rating - More Compact */}
                <div className="flex items-center gap-2 pb-4 border-b border-[#d4c5b0]/30">
                  <span className="font-sf-pro-text text-lg font-bold text-[#610000]">{course.rating}</span>
                  {renderStars(course.rating)}
                  <span className="font-sf-pro-text text-xs text-[#6b5d4f]">({course.students.toLocaleString()})</span>
                </div>

                {/* Meta Info - More Compact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-[#4a3828]">
                    <div className="w-8 h-8 rounded-full bg-[#8b6f47]/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-base text-[#8b6f47]">menu_book</span>
                    </div>
                    <span className="font-sf-pro-text font-medium text-xs">{course.modules} modules</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#4a3828]">
                    <div className="w-8 h-8 rounded-full bg-[#8b6f47]/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-base text-[#8b6f47]">schedule</span>
                    </div>
                    <span className="font-sf-pro-text font-medium text-xs">{course.hours} hours</span>
                  </div>
                </div>
                
                {/* Level & CPD - More Compact */}
                <div className="flex items-center justify-between pt-4 border-t border-[#d4c5b0]/30">
                  <span className="text-xs font-sf-pro-text font-medium text-[#6b5d4f]">{course.level}</span>
                  <span className="text-xs font-sf-pro-text font-bold text-[#610000]">{course.cpd} CPD hrs</span>
                </div>
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
      gradient: "from-blue-50 to-blue-100/50",
      iconColor: "text-blue-700",
      iconBg: "bg-blue-100"
    },
    { 
      icon: "verified",
      title: "CPD / CLE accredited",
      description: "Every course carries verifiable continuing professional development hours recognised by bar associations in 38 jurisdictions worldwide.",
      gradient: "from-amber-50 to-amber-100/50",
      iconColor: "text-amber-700",
      iconBg: "bg-amber-100"
    },
    { 
      icon: "school",
      title: "Expert practitioners as instructors",
      description: "Learn from sitting arbitrators, tribunal secretaries, RIAC panel members, and senior counsel with active international caseloads.",
      gradient: "from-teal-50 to-teal-100/50",
      iconColor: "text-teal-700",
      iconBg: "bg-teal-100"
    },
    { 
      icon: "schedule",
      title: "Self-paced with lifetime access",
      description: "On-demand video, downloadable case studies, interactive assessments, and automatic course updates — all at your pace on any device.",
      gradient: "from-green-50 to-green-100/50",
      iconColor: "text-green-700",
      iconBg: "bg-green-100"
    },
    { 
      icon: "groups",
      title: "Global professional community",
      description: "Join a private network of 4,800+ ADR professionals. Access mentorship, peer discussion forums, and referral pathways.",
      gradient: "from-indigo-50 to-indigo-100/50",
      iconColor: "text-indigo-700",
      iconBg: "bg-indigo-100"
    },
    { 
      icon: "shield",
      title: "Bar association co-badging",
      description: "Certificates issued in collaboration with 14 bar associations and professional bodies, carrying dual institutional authority.",
      gradient: "from-purple-50 to-purple-100/50",
      iconColor: "text-purple-700",
      iconBg: "bg-purple-100"
    },
  ];

  return (
    <section
      ref={ref}
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-[#faf9f6] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              Why choose us
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            Built for the world's best legal minds
          </h2>
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed max-w-3xl font-light">
            Every feature on this platform exists to serve serious ADR practitioners.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-white border-2 border-[#d4c5b0]/30 rounded-[24px] p-10 hover:border-[#8b6f47]/40 hover:shadow-[0_24px_64px_rgba(97,0,0,0.12)] hover:-translate-y-2 transition-all duration-700"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#8b6f47]/10 to-[#8b6f47]/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700 border border-[#d4c5b0]/30">
                <span className="material-symbols-outlined text-4xl text-[#8b6f47]">{feature.icon}</span>
              </div>
              <h3 className="font-sf-pro-display text-2xl font-bold text-[#610000] mb-5 leading-tight">
                {feature.title}
              </h3>
              <p className="font-sf-pro-text text-base text-[#4a3828] leading-relaxed">
                {feature.description}
              </p>
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
      title: "FCIArb · Senior Mediator",
      location: "Lagos & London",
      rating: 4.9,
      students: 1248,
      courses: 2,
      avatarGradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      initials: "IP",
      name: "Dr. Ivan Petrov",
      title: "RIAC Panel Member",
      location: "Moscow & Geneva",
      rating: 4.8,
      students: 976,
      courses: 3,
      avatarGradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      initials: "KA",
      name: "Prof. Kwame Asante",
      title: "ICJ Consultant",
      location: "Ghana Bar Association",
      rating: 4.9,
      students: 702,
      courses: 2,
      avatarGradient: "from-[#610000] to-[#8b0000]"
    },
    { 
      initials: "EM",
      name: "Dr. Elena Morozova",
      title: "LCIA Arbitrator",
      location: "Emergency Relief Specialist",
      rating: 4.8,
      students: 389,
      courses: 2,
      avatarGradient: "from-[#610000] to-[#8b0000]"
    },
  ];

  return (
    <section
      ref={ref}
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-gradient-to-b from-[#faf9f6]/30 to-white transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              Meet the faculty
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            Learn from the best
          </h2>
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed max-w-3xl font-light">
            Our instructors are active practitioners — not just academics.
          </p>
        </div>

        {/* Instructors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {instructors.map((ins) => (
            <div
              key={ins.name}
              className="group bg-white border-2 border-[#d4c5b0]/30 rounded-[24px] text-center overflow-hidden hover:border-[#8b6f47]/40 hover:shadow-[0_24px_64px_rgba(97,0,0,0.12)] hover:-translate-y-3 transition-all duration-700 cursor-pointer"
            >
              {/* Avatar */}
              <div className="pt-12 pb-8">
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${ins.avatarGradient} flex items-center justify-center mx-auto mb-8 shadow-lg border-4 border-white group-hover:scale-110 transition-transform duration-700`}>
                  <span className="font-sf-pro-display text-4xl font-bold text-white">{ins.initials}</span>
                </div>
                <h3 className="font-sf-pro-display text-xl font-bold text-[#610000] mb-3 px-8">
                  {ins.name}
                </h3>
                <p className="font-sf-pro-text text-base font-bold text-[#8b6f47] mb-2 px-8">
                  {ins.title}
                </p>
                <p className="font-sf-pro-text text-sm text-[#6b5d4f] px-8">
                  {ins.location}
                </p>
              </div>

              {/* Stats */}
              <div className="bg-[#faf9f6] border-t-2 border-[#d4c5b0]/30 py-8 px-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="font-sf-pro-display text-2xl font-bold text-[#610000]">{ins.rating}</span>
                      <svg className="w-5 h-5 text-[#8b6f47] fill-[#8b6f47]" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="font-sf-pro-text text-xs text-[#6b5d4f]">Rating</div>
                  </div>
                  <div className="flex flex-col items-center border-x border-[#d4c5b0]/30">
                    <div className="font-sf-pro-display text-2xl font-bold text-[#610000] mb-2">
                      {ins.students.toLocaleString()}
                    </div>
                    <div className="font-sf-pro-text text-xs text-[#6b5d4f]">Students</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="font-sf-pro-display text-2xl font-bold text-[#610000] mb-2">{ins.courses}</div>
                    <div className="font-sf-pro-text text-xs text-[#6b5d4f]">Courses</div>
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

// Partners & Accrediting Institutions Section
function PartnersSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const partners = [
    {
      name: "Russian International Arbitration Congress (RIAC)",
      type: "Featured partner",
      url: "riac-arbitration.com",
      website: "https://modernarbitration.ru/en",
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
      className={`py-32 lg:py-40 px-6 lg:px-12 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Section Header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-[2px] bg-gradient-to-r from-[#8b6f47] to-transparent"></div>
            <span className="font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] text-[#8b6f47]">
              Our network
            </span>
          </div>
          <h2 className="font-sf-pro-display text-5xl lg:text-6xl xl:text-7xl text-[#610000] mb-10 leading-[1.05] tracking-tight font-bold">
            Partners & accrediting institutions
          </h2>
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-relaxed max-w-3xl font-light">
            Every certification carries the weight of institutional recognition.
          </p>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => {
            const featured = partner.featured;
            return (
              <a
                key={partner.name}
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`group rounded-[20px] p-8 flex flex-col gap-3 border-2 transition-all duration-700 ${
                  featured
                    ? "bg-gradient-to-br from-[#8b6f47]/5 to-[#8b6f47]/10 border-[#8b6f47]/30 hover:border-[#8b6f47]/50 hover:shadow-[0_20px_48px_rgba(139,111,71,0.15)]"
                    : "bg-white border-[#d4c5b0]/30 hover:border-[#8b6f47]/40 hover:shadow-[0_20px_48px_rgba(97,0,0,0.12)]"
                } hover:-translate-y-1`}
              >
                <div className={`font-sf-pro-text text-xs font-bold uppercase tracking-[0.12em] mb-1 ${
                  featured ? "text-[#8b6f47]" : "text-[#6b5d4f]"
                }`}>
                  {partner.type}
                </div>
                <h3 className={`font-sf-pro-display text-lg font-bold leading-tight ${
                  featured ? "text-[#610000]" : "text-[#610000]"
                }`}>
                  {partner.name}
                </h3>
                <div className={`font-sf-pro-text text-sm mt-2 inline-flex items-center gap-2 ${
                  featured ? "text-[#8b6f47]" : "text-[#8b6f47]"
                }`}>
                  <span>{partner.url}</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}


