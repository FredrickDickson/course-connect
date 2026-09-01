import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import cimaLogo from "/uploads/logo.png";
import FinalCTASection from "./FinalCTASection";
import { Gavel, Users, Globe, Star, ArrowRight, CheckCircle, Award, Clock, BookOpen } from "lucide-react";

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
        setLocation("/sessions");
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  return (
    <div className="bg-[#faf9f6] text-[#2c2015] font-sf-pro-text selection:bg-[#5A2633]/10 min-h-screen">
      {/* Premium Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-8 px-6 lg:px-12">
        <div className="max-w-[1600px] mx-auto">
          <nav className="bg-white/80 backdrop-blur-2xl rounded-[20px] shadow-[0_8px_32px_rgba(97,0,0,0.08)] border border-[#5A2633]/5">
            <div className="flex h-24 items-center justify-between px-8 lg:px-12">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-4 hover:opacity-90 transition-all duration-500 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#5A2633]/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img 
                    src={cimaLogo} 
                    alt="CIMA Logo" 
                    className="relative h-14 w-auto transform group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div>
                  <div className="hidden sm:block">
                    <h1 className="text-2xl font-bold text-[#5A2633] font-sf-pro-display tracking-tight">CIMA Learn</h1>
                    <p className="text-[10px] text-[#8b6f47] -mt-1 font-sf-pro-text tracking-[0.08em] uppercase font-semibold">Professional ADR Education</p>
                  </div>
                </div>
              </Link>
              
              {/* Navigation Links */}
              <div className="hidden lg:flex items-center space-x-1">
                <Link href="/courses">
                  <button className="relative text-base font-medium text-[#4a3828] hover:text-[#5A2633] px-6 py-3 rounded-[14px] hover:bg-[#5A2633]/5 transition-all duration-500 group">
                    <span className="relative z-10">Courses</span>
                  </button>
                </Link>
                <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
                  <button className="relative text-base font-medium text-[#4a3828] hover:text-[#5A2633] px-6 py-3 rounded-[14px] hover:bg-[#5A2633]/5 transition-all duration-500 group">
                    <span className="relative z-10">Pathways</span>
                  </button>
                </a>
                <Link href="/contact">
                  <button className="relative text-base font-medium text-[#4a3828] hover:text-[#5A2633] px-6 py-3 rounded-[14px] hover:bg-[#5A2633]/5 transition-all duration-500 group">
                    <span className="relative z-10">Contact</span>
                  </button>
                </Link>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <button className="hidden sm:block text-base font-medium text-[#4a3828] hover:text-[#5A2633] transition-all duration-500 px-6 py-3">
                    Member Portal
                  </button>
                </Link>
                <Link href="/register">
                  <button className="group relative bg-gradient-to-br from-[#5A2633] to-[#5A2633] text-white px-8 py-3.5 text-base font-semibold rounded-[14px] overflow-hidden hover:shadow-[0_12px_32px_rgba(97,0,0,0.24)] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#5A2633] to-[#5A2633] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <span className="relative z-10">Enroll Now</span>
                  </button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main className="pt-32">
        {/* Premium Hero Section */}
        <PremiumHeroSection />

        {/* Trust Indicators Bar */}
        <TrustIndicatorsSection />

        {/* Qualification Pathway */}
        <QualificationPathwaySection />

        {/* Visual Break - Library Image */}
        <CIMAAdvantageSection />

        {/* RIAC Partnership */}
        <RIACPartnershipSection />

        {/* Why Choose CIMA - Redesigned */}
        <WhyChooseUsSection />

        {/* Featured Courses - Completely Redesigned */}
        <FeaturedCoursesSection />

        {/* Learning Paths - Redesigned */}
        <LearningPathsSection />

        {/* Meet Faculty - Redesigned */}
        <MeetTheFacultySection />

        {/* Testimonials - Redesigned */}
        <TestimonialsSection />

        {/* Student Reviews */}
        <StudentReviewsSection />

        {/* Institutional Network - Redesigned */}
        <InstitutionalNetworkSection />

        {/* Partners */}
        <PartnersSection />

        {/* Global Institutional Engagement */}
        <GlobalInstitutionalEngagementSection />

        {/* Final CTA */}
        <FinalCTASection />
      </main>

      {/* Premium Footer */}
      <PremiumFooter />
    </div>
  );
}

// Premium Hero Section - Completely Redesigned
function PremiumHeroSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  return (
    <section 
      ref={ref}
      className={`relative min-h-[95vh] flex items-center px-6 lg:px-12 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Elegant Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#faf9f6] via-[#f5f3ed] to-[#faf9f6]"></div>
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #5A2633 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -right-64 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#8b6f47]/10 to-transparent blur-3xl"></div>
      <div className="absolute bottom-1/4 -left-64 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#5A2633]/5 to-transparent blur-3xl"></div>

      <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center py-24 lg:py-32 relative z-10">
        {/* Left: Content */}
        <div className="lg:col-span-6 space-y-12">
          {/* Overline Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-[#8b6f47]/10 shadow-[0_4px_16px_rgba(139,111,71,0.08)] animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-[#8b6f47] animate-pulse"></div>
            <span className="font-sf-pro-text text-sm font-semibold tracking-[0.02em] text-[#8b6f47]">
              Center for International Mediators & Arbitrators
            </span>
          </div>

          {/* Hero Headline */}
          <div className="space-y-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
            <h1 className="font-sf-pro-display text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] xl:text-[6rem] leading-[0.95] text-[#5A2633] tracking-[-0.02em] font-bold">
              The Definitive Standard in{" "}
              <span className="block mt-2 font-light italic text-[#5A2633]">
                Self-Paced Learning
              </span>
            </h1>
          </div>

          {/* Description */}
          <p className="font-sf-pro-text text-2xl text-[#4a3828] leading-[1.6] max-w-2xl animate-fade-in font-light" style={{animationDelay: '0.2s'}}>
            Join a global cadre of legal elite. Elevate your practice through rigorous ADR training and certifications recognized by the world's leading arbitral institutions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 animate-fade-in" style={{animationDelay: '0.3s'}}>
            <Link href="/courses">
              <button className="group relative bg-gradient-to-br from-[#5A2633] to-[#5A2633] text-white px-10 py-5 rounded-[16px] font-sf-pro-text font-semibold text-lg tracking-wide overflow-hidden hover:shadow-[0_20px_48px_rgba(97,0,0,0.24)] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#5A2633] to-[#5A2633] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Browse Courses
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-500" />
                </span>
              </button>
            </Link>
            <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
              <button className="group relative bg-white border-2 border-[#d4c5b0] text-[#5A2633] px-10 py-5 rounded-[16px] font-sf-pro-text font-semibold text-lg tracking-wide hover:border-[#8b6f47] hover:shadow-[0_12px_32px_rgba(139,111,71,0.12)] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98]">
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Explore Pathways
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-500" />
                </span>
              </button>
            </a>
          </div>

          {/* Trust Metrics */}
          <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-[#d4c5b0]/30 animate-fade-in" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#8b6f47]/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-[#8b6f47] fill-[#8b6f47]" />
              </div>
              <div>
                <div className="text-2xl font-sf-pro-display font-bold text-[#5A2633]">4.9</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Average Rating</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#8b6f47]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#8b6f47]" />
              </div>
              <div>
                <div className="text-2xl font-sf-pro-display font-bold text-[#5A2633]">4,800+</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Active Members</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#8b6f47]/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-[#8b6f47]" />
              </div>
              <div>
                <div className="text-2xl font-sf-pro-display font-bold text-[#5A2633]">38</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Jurisdictions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Premium Image */}
        <div className="lg:col-span-6 relative animate-fade-in" style={{animationDelay: '0.2s'}}>
          {/* Decorative Frame */}
          <div className="absolute -inset-4 bg-gradient-to-br from-[#8b6f47]/10 to-[#5A2633]/5 rounded-[32px] blur-2xl"></div>
          
          {/* Main Image Container */}
          <div className="relative h-[600px] lg:h-[750px] rounded-[28px] overflow-hidden shadow-[0_24px_64px_rgba(97,0,0,0.16)] border border-white/50">
            <div className="absolute inset-0 bg-gradient-to-br from-[#5A2633]/10 via-transparent to-[#8b6f47]/10"></div>
            <img 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-105" 
              alt="Professional legal professionals in modern office environment reviewing documents and collaborating on international arbitration cases" 
              src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80" 
            />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>

          {/* Floating Credential Badge */}
          <div className="absolute -bottom-8 -left-8 bg-white rounded-[24px] shadow-[0_16px_48px_rgba(97,0,0,0,0.2)] border border-[#d4c5b0]/20 p-8 hidden lg:block backdrop-blur-sm bg-white/95">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-[18px] bg-gradient-to-br from-[#5A2633] to-[#5A2633] flex items-center justify-center shadow-lg">
                <Award className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="text-2xl font-sf-pro-display font-bold text-[#5A2633]">ICC Recognized</div>
                <div className="text-sm font-sf-pro-text text-[#6b5d4f] font-medium">Global Certification</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Trust Indicators - Simplified Bar
function TrustIndicatorsSection() {
  return (
    <section className="py-16 px-6 lg:px-12 border-y border-[#d4c5b0]/20 bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20">
          <div className="text-center">
            <div className="text-4xl font-sf-pro-display font-bold text-[#5A2633] mb-2">ICC</div>
            <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Recognized</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sf-pro-display font-bold text-[#5A2633] mb-2">LCIA</div>
            <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Accredited</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sf-pro-display font-bold text-[#5A2633] mb-2">SIAC</div>
            <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Certified</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sf-pro-display font-bold text-[#5A2633] mb-2">RIAC</div>
            <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Partner</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sf-pro-display font-bold text-[#5A2633] mb-2">CIArb</div>
            <div className="text-sm font-sf-pro-text text-[#6b5d4f]">Approved</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Placeholder sections - will be fully redesigned
function QualificationPathwaySection() {
  return <div></div>;
}

function CIMAAdvantageSection() {
  return <div></div>;
}

function RIACPartnershipSection() {
  return <div></div>;
}

function WhyChooseUsSection() {
  return <div></div>;
}

function FeaturedCoursesSection() {
  return <div></div>;
}

function LearningPathsSection() {
  return <div></div>;
}

function MeetTheFacultySection() {
  return <div></div>;
}

function TestimonialsSection() {
  return <div></div>;
}

function StudentReviewsSection() {
  return <div></div>;
}

function InstitutionalNetworkSection() {
  return <div></div>;
}

function PartnersSection() {
  return <div></div>;
}

function GlobalInstitutionalEngagementSection() {
  return <div></div>;
}

function PremiumFooter() {
  return <div></div>;
}
