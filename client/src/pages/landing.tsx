import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import cimaLogo from "/uploads/logo.png";
import { ArrowRight, Award, BookOpen, CheckCircle, Clock, Globe, Gavel, Star, Users, Calendar, MapPin, Handshake, TrendingUp, BadgeCheck, Scale, Sparkles, Download, FileText } from "lucide-react";

// Custom inline icon: Engineer hard hat
const HelmetIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 14c0-1.5 4-4 10-4s10 2.5 10 4v1a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1v-1z" />
    <path d="M6 13c1-2 3-3 6-3s5 1 6 3" opacity="0.9" />
    <path d="M7 11c0-2 2-4 5-4s5 2 5 4" />
    <path d="M9 20c1 0 1.5-1 3-1s2 .9 3 1" opacity="0.6" />
  </svg>
);
import { supabase } from "@/integrations/supabase/client";
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { PwaInstallButton } from "@/components/pwa-install-button";

// Live Session Pop-up Component - Flying in animation with auto-show
function LiveSessionBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: upcomingSessions } = useQuery({
    queryKey: ["upcoming-sessions-landing"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Check the active time window as well as status because scheduled status
      // can remain unchanged when no background status job is running.
      const { data: liveData, error: liveError } = await (supabase as any)
        .from("live_sessions")
        .select(`
          *,
          instructor:users!live_sessions_instructor_id_fkey(first_name, last_name),
          course:courses(title)
        `)
        .in("status", ["live", "scheduled"])
        .lte("scheduled_start", now)
        .gte("scheduled_end", now)
        .eq("is_public", true)
        .order("scheduled_start", { ascending: true })
        .limit(1);

      if (liveError) throw liveError;
      
      // If there's a live session, show it first
      if (liveData && liveData.length > 0) {
        return liveData;
      }

      // Otherwise, get the next scheduled session
      const { data: scheduledData, error: scheduledError } = await (supabase as any)
        .from("live_sessions")
        .select(`
          *,
          instructor:users!live_sessions_instructor_id_fkey(first_name, last_name),
          course:courses(title)
        `)
        .eq("status", "scheduled")
        .eq("is_public", true)
        .gte("scheduled_start", now)
        .lte("scheduled_start", oneWeekFromNow)
        .order("scheduled_start", { ascending: true })
        .limit(1);

      if (scheduledError) throw scheduledError;
      return scheduledData || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Auto-show popup after 2 seconds
  useEffect(() => {
    if (upcomingSessions && upcomingSessions.length > 0 && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [upcomingSessions, isDismissed]);

  if (!upcomingSessions || upcomingSessions.length === 0 || isDismissed) {
    return null;
  }

  const session = upcomingSessions[0] as any;
  const startDate = new Date(session.scheduled_start);
  const isLive = session.status === "live";
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsDismissed(true)}
      />

      {/* Pop-up Modal - Compact Nordic Burgundy Design */}
      <div 
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 z-50 w-[90%] sm:w-full max-w-md transition-all duration-700 ${
          isVisible 
            ? '-translate-y-1/2 opacity-100 scale-100' 
            : '-translate-y-full opacity-0 scale-95'
        }`}
      >
        <div className="relative bg-gradient-to-br from-[#800020] via-[#6b0019] to-[#5a0015] rounded-2xl shadow-2xl overflow-hidden border-2 border-[#F5F1E8]">
          {/* Close Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 backdrop-blur-sm"
          >
            <span className="text-white text-xl font-bold leading-none">×</span>
          </button>

          {/* Subtle Corner Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5F1E8]/10 rounded-full -translate-y-16 translate-x-16 blur-3xl"></div>

          <div className="relative p-6">
            {/* Alert Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative w-14 h-14 bg-[#F5F1E8] rounded-full flex items-center justify-center shadow-xl">
                <Calendar className="w-7 h-7 text-[#800020]" />
              </div>
            </div>

            {/* Alert Text */}
            <div className="text-center mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {isLive ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-[#5A2633] rounded-full animate-pulse"></span>
                    Live Now!
                  </span>
                ) : (
                  "Live Session Alert"
                )}
              </h2>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-3 border border-white/20">
                <p className="text-base sm:text-lg font-semibold text-white mb-1 leading-snug" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {session.course?.title || session.title}
                </p>
                <p className="text-sm text-[#F5F1E8] font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {isLive ? "Session in progress" : `${formattedDate} • ${formattedTime}`}
                </p>
              </div>
              <p className="text-sm text-white/80" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {isLive ? "Join the live session now" : "Register now to secure your spot"}
              </p>
            </div>

            {/* CTA Button */}
            <Link href="/login" className="block">
              <button className="w-full bg-[#F5F1E8] text-[#800020] px-6 py-3.5 rounded-lg font-bold text-base hover:bg-[#fffdf7] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <span>{isLive ? "Join Now" : "Join Session"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/course-catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        setLocation(`/course-catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  return (
    <div className="bg-white text-gray-900 min-h-screen">
      {/* Top Alert Bar */}
      <div className="bg-[#5A2633] text-white text-center py-3 px-4">
        <span className="text-base font-body"></span>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-2">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo - Far Left */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 pl-2">
              <img src={cimaLogo} alt="CIMA Learn" className="h-10 w-auto" />
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-[#5A2633] whitespace-nowrap leading-tight font-display">CIMA Learn</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider whitespace-nowrap leading-tight font-body">Professional ADR</p>
              </div>
            </Link>

            {/* Navigation with Search */}
            <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
              <a href="#categories" className="text-base text-gray-700 hover:text-[#5A2633] transition font-medium whitespace-nowrap font-body">Categories</a>
              
              {/* Search Bar in Navbar */}
              <form onSubmit={handleSearch} className="relative w-96">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchInput}
                  placeholder="Search for anything"
                  className="w-full py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#5A2633] focus:border-transparent focus:bg-white transition-all font-body"
                />
              </form>
              
              <Link href="/courses" className="text-base text-gray-700 hover:text-[#5A2633] transition font-medium whitespace-nowrap font-body">Learning Pathways</Link>
              <Link href="/community" className="text-base text-gray-700 hover:text-[#5A2633] transition font-medium whitespace-nowrap font-body">Live Sessions</Link>
              <Link href="/resources" className="text-base text-gray-700 hover:text-[#5A2633] transition font-medium whitespace-nowrap font-body">Resources</Link>
            </nav>

            {/* CTA Buttons - Far Right */}
            <div className="flex items-center gap-3 flex-shrink-0 pr-2">
              <PwaInstallButton className="hidden md:inline-flex" />
              <Link href="/login" className="text-base text-gray-700 hover:text-[#5A2633] transition font-medium whitespace-nowrap font-body">
                Login
              </Link>
              <Link href="/register" className="bg-[#5A2633] text-white px-6 py-2 rounded-md text-base font-semibold hover:bg-[#5A2633] transition whitespace-nowrap font-body shadow-sm hover:shadow-md">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <LiveSessionBanner />
        <HeroSection />
        <InfoBannerSection />
        <FeaturedCoursesSection />
        <TestimonialsSection />
        <Footer />
      </main>
    </div>
  );
}

// Hero Section
function HeroSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={ref} className={`relative h-[92vh] flex items-center justify-center overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Video - Autoplay Loop */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        >
          <source src="/6985520-uhd_3840_2160_25fps.mp4" type="video/mp4" />
          {/* Fallback to original image if video doesn't load */}
          <img
            src="/cl 2.jpg"
            alt="CIMA Learn Professional Training"
            className="w-full h-full object-cover"
          />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Master Dispute Resolution - Top Right Corner */}
      <div className="absolute top-16 right-10 z-10"><br/>
        
      </div>
    </section>
  );
}

// Info Banner Section - Between Hero and Featured Courses
function InfoBannerSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section 
      ref={ref} 
      className={`py-16 md:py-20 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: '#5A2633' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          {/* Text Container */}
          <div className="flex flex-col">
            <h3 
              className="text-4xl md:text-5xl lg:text-6xl"
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                color: '#F5F1E8',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}
            >
              Best 60 ADR Courses & Programs.
            </h3>
            <p 
              className="text-xl md:text-2xl mt-4"
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                color: '#F5F1E8',
                fontWeight: 300,
                letterSpacing: '0.01em'
              }}
            >
              Build your Dispute Resolution Expertise with CIMA.
            </p>
          </div>

          {/* Free Courses Button */}
          <a 
            href="https://cima-cpd-global-2026.tiny-wasp-2896.chatgpt.site" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#F5F1E8] text-[#5A2633] px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:shadow-xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <span>Explore Free Courses</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

// Featured Courses Section - CIMA Professional Development Programmes
function FeaturedCoursesSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  // Course images - cycling through available banners
  const courseImages = [
    "/self-paced/WhatsApp Image 2026-11-03 at 17.20.20.jpeg",
    "/self-paced/WhatsApp Image 2026-11-03 at 17.20.20 (1).jpeg",
    "/self-paced/WhatsApp Image 2026-11-03 at 17.20.20 (2).jpeg",
    "/self-paced/WhatsApp Image 2026-11-03 at 17.20.20 (3).jpeg",
    "/self-paced/WhatsApp Image 2026-11-03 at 17.20.21.jpeg",
    "/self-paced/WhatsApp Image 2026-11-03 at 17.20.21 (1).jpeg"
  ];

  // Professional CPD & CLE Programmes organized by sector
  const professionalSectors = [
    {
      sectionTitle: "CPD for Legal Professionals",
      target: "Ghana Bar Association, General Legal Council and legal practitioners",
      color: "#800020",
      courses: [
        { title: "International Commercial Arbitration: Law, Practice and Procedure", description: "Comprehensive training in international commercial arbitration law, procedural frameworks, and best practices for resolving cross-border commercial disputes." },
        { title: "Mediation Advocacy and Settlement Negotiation", description: "Master the art of mediation advocacy and develop strategic negotiation techniques to achieve optimal settlement outcomes in dispute resolution." },
        { title: "Drafting and Enforcing Arbitration Agreements", description: "Learn to draft effective arbitration clauses and agreements, and understand the legal frameworks for their enforcement in domestic and international contexts." },
        { title: "Arbitral Tribunal Management, Ethics and Procedure", description: "Gain expertise in managing arbitral tribunals, understanding ethical obligations, and navigating procedural requirements in arbitration proceedings." },
        { title: "Recognition, Enforcement and Setting Aside of Arbitral Awards", description: "Study the legal principles and procedures for recognizing, enforcing, and challenging arbitral awards under national and international law." }
      ]
    },
    {
      sectionTitle: "CPD for Accountancy Professionals",
      target: "Institute of Chartered Accountants, Ghana",
      color: "#2C3E50",
      courses: [
        { title: "Financial Expert Evidence in Commercial Arbitration", description: "Develop skills in providing expert financial evidence in arbitration proceedings, including valuation, damages assessment, and forensic accounting." },
        { title: "Mediation of Shareholder and Partnership Disputes", description: "Learn specialized mediation techniques for resolving complex shareholder disagreements and partnership conflicts in business contexts." },
        { title: "Expert Determination of Business Valuation Disputes", description: "Master the process of expert determination in business valuation disputes, including methodologies, standards, and procedural frameworks." },
        { title: "Negotiating Insolvency and Debt Restructuring Settlements", description: "Gain expertise in negotiating settlements in insolvency proceedings and debt restructuring scenarios, balancing stakeholder interests." },
        { title: "Resolving Accounting and Audit-Related Professional Disputes", description: "Learn effective dispute resolution strategies for accounting and audit-related professional disagreements and regulatory matters." }
      ]
    },
    {
      sectionTitle: "CPD for Taxation Professionals",
      target: "Chartered Institute of Taxation, Ghana",
      color: "#5A2633",
      courses: [
        { title: "Negotiation and Settlement of Tax Controversies", description: "Develop negotiation skills for resolving tax disputes with revenue authorities and achieving favorable settlement outcomes for clients." },
        { title: "Mediation of Tax Disputes Within Applicable Legal Frameworks", description: "Learn to mediate tax disputes effectively within the constraints of tax law and regulatory requirements." },
        { title: "Expert Determination of Tax and Accounting Issues", description: "Master the role of expert determination in resolving complex tax and accounting technical disputes." },
        { title: "Arbitration of Tax-Related Commercial Contract Disputes", description: "Understand arbitration procedures for commercial disputes with tax implications and cross-border tax issues." },
        { title: "Managing Evidence and Settlement Agreements in Tax Disputes", description: "Learn best practices for managing evidence and drafting settlement agreements in tax controversy resolution." }
      ]
    },
    {
      sectionTitle: "CPD for Banking and Financial Professionals",
      target: "Chartered Institute of Bankers, Ghana, and financial institutions",
      color: "#34495E",
      courses: [
        { title: "Mediation of Banking and Customer Complaints", description: "Develop skills in mediating disputes between banks and customers, including service complaints and contractual disagreements." },
        { title: "Negotiating Loan Restructuring and Debt Settlements", description: "Master negotiation techniques for loan restructuring and debt settlement arrangements in banking and finance." },
        { title: "Arbitration in Banking and Financial Services", description: "Learn arbitration procedures specific to banking and financial services disputes, including regulatory considerations." },
        { title: "Fintech, Digital Payments and Cryptocurrency Disputes", description: "Gain expertise in resolving disputes arising from fintech platforms, digital payment systems, and cryptocurrency transactions." },
        { title: "Online Dispute Resolution for Financial Institutions", description: "Understand ODR platforms and procedures designed for efficient resolution of financial services disputes." }
      ]
    },
    {
      sectionTitle: "CPD for Marketing Professionals",
      target: "Chartered Institute of Marketing, Ghana",
      color: "#800020",
      courses: [
        { title: "Mediation of Advertising and Marketing Contract Disputes", description: "Learn mediation techniques for resolving disputes in advertising agreements and marketing service contracts." },
        { title: "Negotiating Commercial Sponsorship and Partnership Agreements", description: "Develop negotiation skills for sponsorship deals and marketing partnerships, including dispute prevention strategies." },
        { title: "Arbitration of Intellectual Property and Licensing Disputes", description: "Master arbitration procedures for intellectual property and licensing disputes in marketing and brand management." },
        { title: "Consumer Dispute Resolution and Complaint Management", description: "Gain expertise in resolving consumer complaints and disputes arising from marketing activities and consumer protection issues." },
        { title: "Resolving Digital Marketing and Platform Disputes", description: "Learn to resolve disputes specific to digital marketing, social media platforms, and online advertising." }
      ]
    },
    {
      sectionTitle: "CPD for Engineering Professionals",
      target: "Ghana Institution of Engineering",
      color: "#2C3E50",
      courses: [
        { title: "Construction Arbitration under FIDIC Contracts", description: "Comprehensive training in arbitration procedures under FIDIC contract conditions for engineering and construction projects." },
        { title: "Dispute Boards and Construction Adjudication", description: "Learn the operation of dispute boards and adjudication procedures in construction dispute resolution." },
        { title: "Mediation of Engineering and Infrastructure Disputes", description: "Develop mediation skills tailored to technical engineering disputes and infrastructure project conflicts." },
        { title: "Expert Determination of Technical and Engineering Claims", description: "Master expert determination procedures for resolving technical engineering claims and specifications disputes." },
        { title: "Engineering Expert Witnesses in Arbitration Proceedings", description: "Learn to serve as an expert witness in arbitration, including report writing and testimony best practices." }
      ]
    },
    {
      sectionTitle: "CPD for Surveying Professionals",
      target: "Ghana Institution of Surveyors",
      color: "#5A2633",
      courses: [
        { title: "Land Boundary Mediation and Customary Dispute Resolution", description: "Specialized training in mediating land boundary disputes and applying customary dispute resolution methods." },
        { title: "Expert Determination of Property Valuation Disputes", description: "Learn expert determination procedures for resolving property valuation disagreements and assessment disputes." },
        { title: "Arbitration of Construction Payment and Quantity Surveying Claims", description: "Master arbitration of payment disputes and quantity surveying claims in construction projects." },
        { title: "Negotiating Land Acquisition and Compensation Settlements", description: "Develop negotiation skills for land acquisition processes and compensation settlement discussions." },
        { title: "Surveyors as Expert Witnesses in Arbitration", description: "Learn the role of surveyors as expert witnesses, including evidence preparation and cross-examination." }
      ]
    },
    {
      sectionTitle: "CPD for Planning Professionals",
      target: "Ghana Institute of Planning",
      color: "#34495E",
      courses: [
        { title: "Mediation of Land-Use and Planning Disputes", description: "Gain expertise in mediating land-use conflicts and planning permission disputes." },
        { title: "Community Negotiation and Stakeholder Conflict Management", description: "Learn facilitation and negotiation techniques for managing stakeholder conflicts in planning processes." },
        { title: "Resolving Disputes in Urban Development Projects", description: "Master dispute resolution strategies specific to urban development and regeneration projects." },
        { title: "Environmental and Infrastructure Dispute Mediation", description: "Develop mediation skills for environmental and infrastructure project disputes." },
        { title: "Facilitated Dialogue in Planning and Administrative Conflicts", description: "Learn facilitation techniques for planning disputes and administrative decision-making processes." }
      ]
    },
    {
      sectionTitle: "CPD for Architectural Professionals",
      target: "Ghana Institute of Architects",
      color: "#800020",
      courses: [
        { title: "Arbitration of Architectural and Construction Contracts", description: "Comprehensive training in arbitration of architectural services and construction contract disputes." },
        { title: "Mediation of Design Variations and Professional Fee Disputes", description: "Learn to mediate disputes over design changes and professional fee disagreements." },
        { title: "Expert Determination of Architectural Defects and Claims", description: "Master expert determination in architectural defect claims and design liability disputes." },
        { title: "Multiparty Mediation in Construction Projects", description: "Develop skills in managing multiparty mediations involving architects, contractors, and clients." },
        { title: "Dispute Avoidance and Resolution in Professional Services Agreements", description: "Learn proactive dispute prevention and resolution strategies in architectural service agreements." }
      ]
    },
    {
      sectionTitle: "CPD for Corporate Directors and Board Members",
      target: "Institute of Directors, Ghana, and corporate boards",
      color: "#2C3E50",
      courses: [
        { title: "Boardroom Mediation and Corporate Conflict Resolution", description: "Specialized mediation training for boardroom conflicts and corporate governance disputes." },
        { title: "Arbitration of Shareholder and Corporate Governance Disputes", description: "Learn arbitration procedures for shareholder disputes and corporate governance disagreements." },
        { title: "Negotiating Executive and Boardroom Settlements", description: "Master negotiation techniques for executive disputes and board-level conflicts." },
        { title: "Succession and Leadership Dispute Mediation", description: "Gain expertise in mediating succession planning disputes and leadership transition conflicts." },
        { title: "Designing Corporate Dispute Prevention and Resolution Systems", description: "Learn to design and implement corporate dispute resolution systems and escalation protocols." }
      ]
    },
    {
      sectionTitle: "CPD for Teaching and Educational Professionals",
      target: "National Teaching Council, Ghana Education Service and educational institutions",
      color: "#5A2633",
      courses: [
        { title: "School-Based Mediation and Conflict Resolution", description: "Learn mediation techniques for resolving conflicts in educational settings, including student and staff disputes." },
        { title: "Negotiation Skills for Educational Leaders", description: "Develop negotiation skills for educational administrators and leadership roles." },
        { title: "Mediation of Parent–Teacher and Community Disputes", description: "Master mediation of disputes between parents, teachers, and school communities." },
        { title: "Workplace Grievance Mediation in Educational Institutions", description: "Learn to mediate workplace grievances and employment disputes in educational settings." },
        { title: "Peer Mediation and Restorative Conflict Resolution in Schools", description: "Gain expertise in peer mediation programs and restorative justice practices in education." }
      ]
    },
    {
      sectionTitle: "CPD for Medical Professionals",
      target: "Medical and Dental Council, Ghana Medical Association, doctors, dentists and hospital administrators",
      color: "#34495E",
      courses: [
        { title: "Healthcare Mediation and Patient Complaint Resolution", description: "Specialized training in mediating healthcare disputes and resolving patient complaints." },
        { title: "Medical Negligence Disputes: Mediation, Negotiation and Settlement", description: "Learn mediation and negotiation strategies for medical negligence claims and malpractice disputes." },
        { title: "Hospital Dispute Resolution and Clinical Conflict Management", description: "Master dispute resolution in hospital settings, including clinical team conflicts." },
        { title: "Medico-Legal Arbitration and Expert Witness Practice", description: "Develop skills in medico-legal arbitration and serving as a medical expert witness." },
        { title: "Healthcare ADR: Designing Institutional Complaints and Dispute Resolution Systems", description: "Learn to design and implement healthcare-specific dispute resolution systems and complaints procedures." }
      ]
    },
    {
      sectionTitle: "CPD for Nursing and Midwifery Professionals",
      target: "Nursing and Midwifery Council of Ghana",
      color: "#800020",
      courses: [
        { title: "Mediation of Patient and Family Complaints", description: "Learn mediation techniques for resolving complaints from patients and their families." },
        { title: "Workplace Mediation for Nursing and Midwifery Professionals", description: "Develop skills in mediating workplace disputes specific to nursing and midwifery practice." },
        { title: "Negotiation and De-escalation in Healthcare Conflicts", description: "Master negotiation and de-escalation techniques for healthcare conflicts and difficult situations." },
        { title: "Early Resolution of Clinical Service Complaints", description: "Learn early resolution strategies for clinical service complaints and quality of care issues." },
        { title: "Facilitated Resolution of Interprofessional Healthcare Disputes", description: "Gain expertise in facilitating resolution of disputes between healthcare professionals." }
      ]
    },
    {
      sectionTitle: "CPD for Pharmacy Professionals",
      target: "Pharmacy Council Ghana and pharmaceutical professional associations",
      color: "#2C3E50",
      courses: [
        { title: "Mediation of Pharmacy and Patient Complaints", description: "Learn mediation techniques for resolving pharmacy service complaints and patient disputes." },
        { title: "Arbitration of Pharmaceutical Supply Contracts", description: "Master arbitration procedures for pharmaceutical supply and distribution contract disputes." },
        { title: "Negotiating Pharmaceutical Procurement Disputes", description: "Develop negotiation skills for pharmaceutical procurement and vendor disputes." },
        { title: "Mediation of Pharmacy Partnership and Business Disputes", description: "Learn to mediate disputes in pharmacy partnerships and business arrangements." },
        { title: "Dispute Prevention and Ethical Complaint Resolution in Pharmacy Practice", description: "Gain expertise in preventing disputes and resolving ethical complaints in pharmacy practice." }
      ]
    },
    {
      sectionTitle: "CPD for Allied Health Professionals",
      target: "Allied Health Professions Council",
      color: "#5A2633",
      courses: [
        { title: "Patient Complaint Mediation for Allied Health Professionals", description: "Specialized mediation training for patient complaints in allied health professions." },
        { title: "Negotiating Healthcare Service Disputes", description: "Learn negotiation techniques for healthcare service delivery disputes." },
        { title: "Mediation of Interprofessional Healthcare Conflicts", description: "Master mediation of conflicts between different healthcare professional groups." },
        { title: "Expert Evidence and Technical Determination in Healthcare Disputes", description: "Develop skills in providing expert evidence and technical determination in healthcare disputes." },
        { title: "Managing Professional Fee and Service Agreement Disputes", description: "Learn to manage disputes over professional fees and service agreements in healthcare." }
      ]
    },
    {
      sectionTitle: "CPD for Psychology and Counselling Professionals",
      target: "Ghana Psychology Council",
      color: "#34495E",
      courses: [
        { title: "Psychology of Conflict and Negotiation", description: "Study the psychological principles underlying conflict and negotiation behavior." },
        { title: "Trauma-Informed Mediation Practice", description: "Learn trauma-informed approaches to mediation and dispute resolution." },
        { title: "Mediation, Counselling and Professional Boundaries", description: "Understand professional boundaries between mediation and counselling practices." },
        { title: "Workplace Conflict Coaching and Facilitated Dialogue", description: "Develop skills in conflict coaching and facilitating workplace dialogue." },
        { title: "Confidentiality, Consent and Ethics in Mediation", description: "Master ethical considerations, confidentiality requirements, and consent in mediation practice." }
      ]
    },
    {
      sectionTitle: "CPD for Internal Audit Professionals",
      target: "Institute of Internal Auditors Ghana",
      color: "#800020",
      courses: [
        { title: "Mediation of Corporate Governance and Internal Control Disputes", description: "Learn to mediate disputes related to corporate governance and internal control issues." },
        { title: "Expert Evidence and Forensic Accounting in Arbitration", description: "Develop skills in providing expert forensic accounting evidence in arbitration." },
        { title: "Negotiation of Audit Findings and Remedial Action Plans", description: "Master negotiation techniques for discussing audit findings and remediation strategies." },
        { title: "Managing Audit Committee and Management Conflicts", description: "Learn to manage conflicts between audit committees and management." },
        { title: "Dispute Prevention through Internal Control and Contract Risk Management", description: "Gain expertise in preventing disputes through effective internal controls and risk management." }
      ]
    },
    {
      sectionTitle: "CPD for Procurement and Supply Chain Professionals",
      target: "Chartered Institute of Procurement & Supply, Ghana Branch, and Ghana Institute of Procurement and Supply",
      color: "#2C3E50",
      courses: [
        { title: "Arbitration of Procurement and Supply Contracts", description: "Comprehensive training in arbitration of procurement and supply chain contract disputes." },
        { title: "Mediation of Supplier and Contractor Disputes", description: "Learn mediation techniques for resolving disputes with suppliers and contractors." },
        { title: "Commercial Negotiation and Contract Renegotiation", description: "Master commercial negotiation skills and contract renegotiation strategies." },
        { title: "Public Procurement Complaints and Dispute Resolution", description: "Understand public procurement complaint mechanisms and dispute resolution procedures." },
        { title: "Managing Contract Variations, Payment Claims and Dispute Boards", description: "Learn to manage contract variations, payment disputes, and operate dispute boards." }
      ]
    },
    {
      sectionTitle: "CPD for Insurance Professionals",
      target: "Chartered Insurance Institute of Ghana, insurance brokers and insurance companies",
      color: "#5A2633",
      courses: [
        { title: "Insurance Claims Mediation and Negotiation", description: "Specialized training in mediating and negotiating insurance claims disputes." },
        { title: "Reinsurance Arbitration: Law and Practice", description: "Master reinsurance arbitration procedures and industry-specific practices." },
        { title: "Mediation of Insurance Coverage Disputes", description: "Learn mediation techniques for insurance coverage disputes and policy interpretation conflicts." },
        { title: "Arbitration of Subrogation and Recovery Claims", description: "Develop expertise in arbitrating subrogation and recovery claim disputes." },
        { title: "Drafting Effective Dispute Resolution Clauses in Insurance Contracts", description: "Learn to draft clear and enforceable dispute resolution clauses for insurance agreements." }
      ]
    },
    {
      sectionTitle: "CPD for Real Estate Professionals",
      target: "Real Estate Agency Council, estate agents, brokers and property managers",
      color: "#34495E",
      courses: [
        { title: "Mediation of Real Estate Sales and Purchase Disputes", description: "Learn mediation techniques for real estate transaction disputes." },
        { title: "Land Title and Boundary Dispute Resolution", description: "Master dispute resolution strategies for land title and boundary conflicts." },
        { title: "Arbitration of Estate Agency Commission and Fee Disputes", description: "Develop skills in arbitrating estate agency commission and fee disagreements." },
        { title: "Landlord–Tenant Negotiation and Mediation", description: "Learn negotiation and mediation techniques for landlord-tenant disputes." },
        { title: "Negotiating Property Transactions and Preventing Contractual Disputes", description: "Master negotiation of property transactions and dispute prevention strategies." }
      ]
    }
  ];

  console.log('FeaturedCoursesSection rendering, sectors count:', professionalSectors.length);
  console.log('First sector:', professionalSectors[0]?.sectionTitle);
  console.log('isVisible:', isVisible);
  console.log('courseImages:', courseImages);
  
  return (
    <section ref={ref} id="categories" className={`relative py-20 overflow-hidden transition-all duration-1000 opacity-100`} style={{ backgroundColor: '#FBF9F5' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: '#182938' }}>
            Institutional CPD & CLE Programmes
          </h2>
          <p className="text-lg text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>
            Specialised Training in Mediation, Arbitration, Negotiation and Dispute Resolution
          </p>
          <p className="text-base text-gray-500 mt-4" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}>
            20 Professional Sectors · 100 Specialised Courses
          </p>
        </div>

        {/* Professional Sectors with Course Cards */}
        {professionalSectors.map((sector, sectorIdx) => {
          // Assign ONE image per sector - all courses in this section use the same image
          const sectorImageUrl = courseImages[sectorIdx % courseImages.length];
          
          return (
          <div key={sectorIdx} className="mb-20">
            {/* Section Header */}
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif', color: sector.color }}>
                {sector.sectionTitle}
              </h3>
            </div>

            {/* Course Cards Grid - 3 columns */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sector.courses.map((course, courseIdx) => {
                // All courses in this sector use the same image
                const imageUrl = sectorImageUrl;
                
                return (
                  <div
                    key={courseIdx}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                    style={{ borderColor: '#D9D3C9', borderWidth: '1px' }}
                  >
                    {/* Course Image Banner */}
                    <div className="relative w-full h-48 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    {/* Card Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      {/* Date Badge */}
                      <div className="flex items-center gap-2 text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif', color: '#66645F', fontWeight: 400 }}>
                        <Clock className="w-4 h-4" />
                        <span>Self-Paced Learning</span>
                      </div>

                      {/* Course Title */}
                      <h4 className="text-xl font-bold mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#252525' }}>
                        {course.title}
                      </h4>

                      {/* Course Description */}
                      <p className="text-sm mb-6 leading-relaxed flex-grow" style={{ fontFamily: 'Montserrat, sans-serif', color: '#66645F', fontWeight: 400 }}>
                        {course.description}
                      </p>

                      {/* Enroll Now Button */}
                      <button 
                        className="w-full py-2.5 px-4 rounded font-bold transition-all duration-300 flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontWeight: 700,
                          backgroundColor: sector.color,
                          color: '#F5F1E8'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span>ENROLL NOW</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}

        {/* Programme Formats Table */}
        <div className="mt-16 max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'Montserrat, sans-serif', color: '#182938' }}>
            CIMA's Institutional Training Formats
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>Programme Category</th>
                  <th className="text-left py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>Proposed Duration</th>
                  <th className="text-left py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>Delivery</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>CPD Essentials</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>2–3 hours</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Online</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Professional Masterclass</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>4–6 hours</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Online or hybrid</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Applied ADR Practicum</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>1–2 days</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Practical simulations</td>
                </tr>
                <tr>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Institutional Certificate Programme</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>15–25 hours</td>
                  <td className="py-3 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Blended learning and assessment</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            These durations are proposed training formats. Official CPD/CLE credits remain subject to the requirements and approval of the relevant professional body or regulator.
          </p>
        </div>
      </div>
    </section>
  );
}

// Search Section - Global search functionality  
function SearchSection() {
  console.log('SearchSection is rendering!'); // DEBUG
  return (
    <section className="py-12 bg-white border-y-4 border-[#5A2633]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[#5A2633] mb-4">SEARCH BAR IS HERE</h2>
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for anything"
              className="w-full py-5 pl-16 pr-6 text-base text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A2633] focus:border-[#5A2633] transition-all hover:border-gray-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Why Learn With CIMA Section - Replaced with Info Banner
function WhyLearnWithCIMASection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section 
      ref={ref} 
      className={`py-32 md:py-40 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 
            className="text-2xl md:text-3xl lg:text-4xl"
            style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              color: '#F5F1E8',
              fontWeight: 300,
              letterSpacing: '0.02em'
            }}
          >
            Master Arbitration, Mediation & Negotiation at Your Own Pace
          </h3>
        </div>
      </div>
    </section>
  );
}

// Brochure Download Section - Enterprise-grade design inspired by Meta, Microsoft, Salesforce
// Brochure Download Section - Simple direct download
function BrochureDownloadSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const handleDownload = () => {
    // Simple direct download approach - works best with service workers
    const link = document.createElement('a');
    link.href = '/uploads/2026 CIMA Summer School-compressed.pdf';
    link.download = 'CIMA-Learn-Summer-School-2026.pdf';
    link.target = '_blank'; // Open in new tab as fallback
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section ref={ref} className={`relative py-24 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Premium Background with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=2880&h=1000&auto=format&fit=crop&q=100"
          alt="Professional office workspace"
          className="w-full h-full object-cover opacity-15"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#5A2633]/10 text-[#5A2633] px-4 py-2 rounded-full text-sm font-semibold font-body">
              <FileText className="w-4 h-4" />
              Professional Resources
            </div>

            {/* Headline - Microsoft Fluent Style */}
            <div>
              <h2 className="text-5xl lg:text-6xl font-light text-gray-900 mb-6 font-display leading-tight">
                Get our complete
                <br />
                <span className="text-[#5A2633] font-semibold">programme brochure</span>
              </h2>
              <p className="text-xl text-gray-700 leading-relaxed font-body">
                Discover comprehensive details about our certification pathways, course offerings, faculty expertise, and career outcomes in a beautifully designed PDF guide.
              </p>
            </div>

            {/* Feature List - Minimal Icons */}
            <div className="space-y-4">
              {[
                { icon: CheckCircle, text: "Complete course catalog & learning pathways" },
                { icon: Award, text: "Accreditation details & certification information" },
                { icon: Users, text: "International faculty profiles & testimonials" },
                { icon: TrendingUp, text: "Career advancement statistics & success stories" }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5A2633]/10 flex items-center justify-center mt-1">
                      <Icon className="w-4 h-4 text-[#5A2633]" />
                    </div>
                    <p className="text-lg text-gray-800 font-body font-medium">{feature.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Trust Signals - Meta Style */}
            <div className="flex flex-wrap items-center gap-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5A2633] to-[#5A2633] flex items-center justify-center shadow-lg">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 font-display">2,400+</p>
                  <p className="text-sm text-gray-600 font-body">Downloads</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 font-display">4.9/5</p>
                  <p className="text-sm text-gray-600 font-body">Rated by learners</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Simple Download Button */}
          <div className="lg:pl-8">
            <div className="bg-white rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.08)] border border-gray-100 p-8 lg:p-12 relative overflow-hidden">
              {/* Decorative Element */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#5A2633]/5 to-transparent rounded-full blur-3xl" />
              
              <div className="relative text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#5A2633] to-[#5A2633] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Download className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-3xl font-semibold text-gray-900 mb-3 font-display">Download Your Copy</h3>
                <p className="text-lg text-gray-600 mb-8 font-body">Get instant access to our comprehensive brochure</p>

                {/* Download Button - Premium Design */}
                <button
                  onClick={handleDownload}
                  className="group w-full bg-gradient-to-r from-[#5A2633] to-[#5A2633] text-white px-8 py-5 rounded-xl text-xl font-semibold hover:shadow-[0_10px_40px_rgba(97,0,0,0.3)] transition-all duration-300 flex items-center justify-center gap-3 font-body"
                >
                  <Download className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Brochure (PDF)</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="text-sm text-gray-500 mt-6 font-body">
                  9.66 MB • 2026 Summer School Programme
                </p>
              </div>
            </div>

            {/* Below Card CTA */}
            <p className="text-center text-base text-gray-600 mt-6 font-body">
              Questions? <Link href="/contact" className="text-[#5A2633] hover:underline font-semibold">Contact our team</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const testimonials = [
    {
      quote: "The course structure is excellent and the quality of teaching is world-class. I'm now working as an international arbitrator.",
      name: "Snehal",
      role: "",
      company: "India",
      rating: 5,
      image: "/images/snehal.jpeg"
    },
    {
      quote: "CIMA Learn allowed me to learn while working full time. The flexible schedule and live sessions were perfect for my career.",
      name: "Diana Kanyuithia",
      role: "",
      company: "Kenya",
      rating: 5,
      image: "/images/diana.jpeg"
    },
    {
      quote: "A sophisticated programme that bridges theory and real-world practice. Worth every penny for career development.",
      name: "Saqib Javed",
      role: "",
      company: "Pakistan",
      rating: 5,
      image: "/images/saqib.jpeg"
    },
  ];

  return (
    <section 
      ref={ref} 
      className={`relative py-24 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)'
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <h2 className="text-5xl font-light mb-2" style={{ fontFamily: 'Montserrat, sans-serif', color: '#F5F1E8', fontWeight: 300 }}>
            What Learners Say
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="backdrop-blur-sm border rounded-lg p-8 hover:shadow-2xl transition-all duration-300" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(245, 241, 232, 0.2)' }}>
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="mb-8 leading-relaxed text-lg" style={{ fontFamily: 'Montserrat, sans-serif', color: '#F5F1E8', fontWeight: 400 }}>
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 border-t pt-6" style={{ borderColor: 'rgba(245, 241, 232, 0.2)' }}>
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full object-cover border-2"
                  style={{ borderColor: '#F5F1E8' }}
                />
                <div>
                  <p className="font-semibold" style={{ fontFamily: 'Montserrat, sans-serif', color: '#F5F1E8' }}>{testimonial.name}</p>
                  <p className="text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif', color: 'rgba(245, 241, 232, 0.8)', fontWeight: 400 }}>{testimonial.role}</p>
                  <p className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif', color: 'rgba(245, 241, 232, 0.7)', fontWeight: 400 }}>{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Upcoming Live Programs Section
function UpcomingLiveProgramsSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const programs = [
    {
      date: "27",
      month: "NOV",
      title: "LIVE IICA Drafting Arbitration Awards Masterclass",
      instructor: "Delivered by Justice Discourse Consult",
      time: "11:00 pm - 1:00 pm GMT",
      attendees: 94,
      status: "Register Now"
    },
    {
      date: "03",
      month: "DECEMBER",
      title: "Wednesday Witness Examination Skills",
      instructor: "Witness Training: Professor Martha Jeffris",
      time: "01:00 am - 03:00 am GMT",
      attendees: 182,
      status: "Register Now"
    },
    {
      date: "10",
      month: "DECEMBER",
      title: "Arbitration & AI Enforcement of Awards",
      instructor: "Prof. Mohammed Taha - Zurich, CH",
      time: "02:00 pm - 04:00 pm GMT",
      attendees: 216,
      status: "Register Now"
    },
    {
      date: "17",
      month: "DECEMBER",
      title: "FRMI-DISCUSSION Mastery of Ethics",
      instructor: "Dr. Sarah M. Konki - NYU",
      time: "11:00 am - 01:00 pm GMT",
      attendees: 143,
      status: "Register Now"
    },
  ];

  return (
    <section ref={ref} className={`py-20 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Upcoming Live Programs</h2>
            <p className="text-gray-600">Join our expert-led live sessions and masterclasses</p>
          </div>
          <button className="text-[#5A2633] font-semibold hover:underline flex items-center gap-1">
            View all programs
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((program, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              {/* Date Badge */}
              <div className="bg-[#5A2633] text-white text-center py-4">
                <p className="text-3xl font-bold">{program.date}</p>
                <p className="text-sm uppercase tracking-wide">{program.month}</p>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#5A2633] transition min-h-[3rem]">
                  {program.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]">
                  {program.instructor}
                </p>
                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {program.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {program.attendees} attending
                  </div>
                </div>
                <button className="w-full bg-[#5A2633] text-white py-2 rounded-lg font-semibold hover:bg-[#5A2633] transition">
                  {program.status}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Final CTA Section
function FinalCTASection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={ref} className={`relative py-32 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Sharp Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=2880&h=1200&auto=format&fit=crop&q=100"
          alt="Professional workspace"
          className="w-full h-full object-cover"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#5A2633]/95 to-[#5A2633]/85" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-6xl font-light mb-8 font-display text-white">Ready to advance your career?</h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
          <Link href="/register">
            <button className="bg-white text-[#5A2633] px-14 py-5 rounded-md font-semibold text-lg hover:bg-gray-100 transition shadow-2xl font-body">
              Create Your Account
            </button>
          </Link>
          <Link href="/courses">
            <button className="border-2 border-white text-white px-14 py-5 rounded-md font-semibold text-lg hover:bg-white/10 transition font-body">
              Browse Courses
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto border-t border-white/20 pt-16">
          <div>
            <p className="text-6xl font-light mb-2 font-display text-white">4,800+</p>
            <p className="text-white/80 text-lg font-body">Learners</p>
          </div>
          <div>
            <p className="text-6xl font-light mb-2 font-display text-white">120+</p>
            <p className="text-white/80 text-lg font-body">Charities</p>
          </div>
          <div>
            <p className="text-6xl font-light mb-2 font-display text-white">200+</p>
            <p className="text-white/80 text-lg font-body">Courses</p>
          </div>
          <div>
            <p className="text-6xl font-light mb-2 font-display text-white">98%</p>
            <p className="text-white/80 text-lg font-body">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="bg-white text-black py-20 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img src="/images/b and w.png" alt="CIMA Learn" className="h-14 w-auto" />
              <div>
                <p className="text-black font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>CIMA Learn</p>
                <p className="text-xs text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Professional ADR Education</p>
              </div>
            </div>
            <p className="text-base text-black leading-relaxed mb-6 max-w-md" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
              World-class arbitration and mediation education with a focus on real-world application and professional advancement.
            </p>
            <div className="flex gap-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition">
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition">
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-base text-black" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>© {new Date().getFullYear()} CIMA Learn. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
