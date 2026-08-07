import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import cimaLogo from "/images/logo.jpeg";
import { ArrowRight, Award, BookOpen, CheckCircle, Clock, Globe, Gavel, Star, Users, Calendar, MapPin, Heart, TrendingUp, GraduationCap, Scale, BadgeCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
        setLocation("/dashboard");
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
      <div className="bg-[#8b0000] text-white text-center py-2 px-4 text-sm">
        <span>Advance your career with world-class ADR training and internationally recognized certifications.</span>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-2">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo - Far Left */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 pl-2">
              <img src={cimaLogo} alt="CIMA Learn" className="h-10 w-auto" />
              <div className="flex flex-col">
                <p className="text-xs font-bold text-[#8b0000] whitespace-nowrap leading-tight">CIMA Learn</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider whitespace-nowrap leading-tight">Professional ADR</p>
              </div>
            </Link>

            {/* Navigation with Search */}
            <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
              <a href="#categories" className="text-sm text-gray-700 hover:text-[#8b0000] transition font-medium whitespace-nowrap">Categories</a>
              
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
                  className="w-full py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#8b0000] focus:border-transparent focus:bg-white transition-all"
                />
              </form>
              
              <Link href="/courses" className="text-sm text-gray-700 hover:text-[#8b0000] transition font-medium whitespace-nowrap">Learning Pathways</Link>
              <Link href="/community" className="text-sm text-gray-700 hover:text-[#8b0000] transition font-medium whitespace-nowrap">Live Sessions</Link>
              <Link href="/resources" className="text-sm text-gray-700 hover:text-[#8b0000] transition font-medium whitespace-nowrap">Resources</Link>
            </nav>

            {/* CTA Buttons - Far Right */}
            <div className="flex items-center gap-3 flex-shrink-0 pr-2">
              <Link href="/login" className="text-sm text-gray-700 hover:text-[#8b0000] transition font-medium whitespace-nowrap">
                Login
              </Link>
              <Link href="/register" className="bg-[#8b0000] text-white px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-[#6d0000] transition whitespace-nowrap">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />
        <StatsBarSection />
        <TrustBadgesSection />
        <FeaturedCoursesSection />
        <LearningPathwaysSection />
        <WhyLearnWithCIMASection />
        <TestimonialsSection />
        <UpcomingLiveProgramsSection />
        <FinalCTASection />
        <Footer />
      </main>
    </div>
  );
}

// Hero Section
function HeroSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={ref} className={`relative h-[85vh] flex items-center justify-center overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Large Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=2400&auto=format&fit=crop&q=80"
          alt="Professional legal workspace"
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
      </div>

      {/* Minimalist Text Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          {/* Small Welcome Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-white" />
            <span className="text-xs font-medium text-white uppercase tracking-wider">Welcome to CIMA Learn</span>
          </div>

          {/* Large Headline - Scandinavian Typography */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white leading-[0.95] mb-8 tracking-tight">
            Master dispute<br />
            resolution.<br />
            <span className="text-white/90 font-light italic">Anywhere, anytime.</span>
          </h1>

          {/* Subtle Description */}
          <p className="text-xl sm:text-2xl text-white/90 font-light leading-relaxed mb-12 max-w-2xl">
            World-class, self-paced and live learning in Arbitration, Mediation, Negotiation, Litigation, Adjudication and more.
          </p>

          {/* Minimal CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/courses">
              <button className="group bg-white text-[#8b0000] px-10 py-4 rounded-full font-semibold text-base hover:bg-gray-100 transition-all shadow-2xl flex items-center justify-center gap-2">
                Explore Courses
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
              <button className="group border-2 border-white text-white px-10 py-4 rounded-full font-semibold text-base hover:bg-white hover:text-[#8b0000] transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                View Learning Pathways
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Floating Stats Card - Minimal Design */}
      <div className="absolute bottom-8 right-8 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-gray-100 hidden lg:block">
        <div className="flex items-center gap-6">
          <div className="text-center border-r border-gray-200 pr-6">
            <p className="text-3xl font-bold text-[#8b0000]">4,800+</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">Learners</p>
          </div>
          <div className="text-center border-r border-gray-200 pr-6">
            <p className="text-3xl font-bold text-[#8b0000]">120+</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">Charities</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#8b0000]">98%</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">Satisfaction</p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:block">
        <div className="flex flex-col items-center gap-2 text-white/80">
          <span className="text-xs uppercase tracking-wider">Scroll</span>
          <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}

// Stats Bar Section
function StatsBarSection() {
  return (
    <section className="bg-white py-16 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="group text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#8b0000]/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <Users className="relative w-8 h-8 text-[#8b0000]" />
              </div>
            </div>
            <p className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">4,800+</p>
            <p className="text-sm text-gray-600 font-medium tracking-wide">Learners</p>
          </div>
          
          <div className="group text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-pink-500/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <Heart className="relative w-8 h-8 text-pink-600" />
              </div>
            </div>
            <p className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">120+</p>
            <p className="text-sm text-gray-600 font-medium tracking-wide">Charities</p>
          </div>
          
          <div className="group text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <BookOpen className="relative w-8 h-8 text-blue-600" />
              </div>
            </div>
            <p className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">200+</p>
            <p className="text-sm text-gray-600 font-medium tracking-wide">Courses</p>
          </div>
          
          <div className="group text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <Star className="relative w-8 h-8 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <p className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">98%</p>
            <p className="text-sm text-gray-600 font-medium tracking-wide">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Trust Badges Section
function TrustBadgesSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const badges = [
    { name: "CIArb", subtitle: "Chartered Institute" },
    { name: "ICC", subtitle: "International Chamber" },
    { name: "UNCITRAL", subtitle: "United Nations" },
    { name: "LCIA", subtitle: "London Court" },
    { name: "ACICA", subtitle: "Australian Centre" },
    { name: "IAI", subtitle: "Arbitration Institute" },
  ];

  return (
    <section ref={ref} className={`py-20 bg-gradient-to-b from-white to-gray-50 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold mb-2">Trusted Worldwide</p>
          <h2 className="text-2xl font-bold text-gray-900">Recognized by Leading Institutions</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
          {badges.map((badge, index) => (
            <div 
              key={index} 
              className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#8b0000]/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#8b0000]/0 to-[#8b0000]/0 group-hover:from-[#8b0000]/5 group-hover:to-transparent rounded-2xl transition-all duration-300"></div>
              <div className="relative text-center">
                <p className="text-2xl font-bold text-gray-900 mb-1">{badge.name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{badge.subtitle}</p>
              </div>
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
  
  const { data: courses = [] } = useQuery({
    queryKey: ["featured-courses-landing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, category:categories(*), instructor:users!courses_instructor_id_fkey(first_name, last_name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <section ref={ref} id="categories" className={`py-20 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Featured Courses</h2>
            <p className="text-gray-600">Explore our most popular ADR programs</p>
          </div>
          <Link href="/courses">
            <button className="text-[#8b0000] font-semibold hover:underline flex items-center gap-1">
              View all courses
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, index: number) => (
            <Link key={course.id} href={`/course/${course.id}`}>
              <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
                {/* Badge */}
                {index === 0 && (
                  <div className="absolute top-4 left-4 bg-[#8b0000] text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                    Featured
                  </div>
                )}
                {index === 1 && (
                  <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                    New
                  </div>
                )}
                
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={course.thumbnail_url || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80"}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="bg-gray-100 px-2 py-1 rounded">{course.category?.name || "ADR"}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#8b0000] transition">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {course.instructor?.first_name} {course.instructor?.last_name}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration_hours || 0}h
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {course.level || "All Levels"}
                    </span>
                  </div>
                  <button className="mt-4 w-full bg-[#8b0000] text-white py-2 rounded-lg font-semibold hover:bg-[#6d0000] transition">
                    Enroll Now
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Search Section - Global search functionality  
function SearchSection() {
  console.log('SearchSection is rendering!'); // DEBUG
  return (
    <section className="py-12 bg-white border-y-4 border-red-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-red-600 mb-4">SEARCH BAR IS HERE</h2>
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
              className="w-full py-5 pl-16 pr-6 text-base text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b0000] focus:border-[#8b0000] transition-all hover:border-gray-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Learning Pathways Section
function LearningPathwaysSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const pathways = [
    {
      icon: Scale,
      title: "Arbitration Expert Pathway",
      description: "Master commercial and international arbitration with our comprehensive curriculum.",
      courses: "6 Courses",
      hours: "24 Hours",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: Users,
      title: "Mediation Specialist Pathway",
      description: "Develop expert mediation and conflict resolution skills with hands-on practice.",
      courses: "5 Courses",
      hours: "18 Hours",
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: GraduationCap,
      title: "Negotiation Professional Pathway",
      description: "Build powerful negotiation and business development skills.",
      courses: "4 Courses",
      hours: "16 Hours",
      color: "bg-green-50 text-green-600"
    },
    {
      icon: Globe,
      title: "Adjudication & Dispute Boards Pathway",
      description: "Gain practical adjudication skills for construction and infrastructure disputes.",
      courses: "4 Courses",
      hours: "16 Hours",
      color: "bg-orange-50 text-orange-600"
    },
  ];

  return (
    <section ref={ref} className={`py-20 bg-gray-50 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Learning Pathways</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Structured learning journeys designed to build expertise and advance your ADR career
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {pathways.map((pathway, index) => {
            const Icon = pathway.icon;
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-all duration-300 group cursor-pointer">
                <div className={`w-14 h-14 ${pathway.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#8b0000] transition">
                  {pathway.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {pathway.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {pathway.courses}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {pathway.hours}
                  </span>
                </div>
                <button className="mt-6 text-[#8b0000] font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                  View Pathway
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
            <button className="text-[#8b0000] font-semibold hover:underline flex items-center gap-2 mx-auto">
              Explore all pathways
              <ArrowRight className="w-5 h-5" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}

// Why Learn With CIMA Section
function WhyLearnWithCIMASection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const benefits = [
    {
      icon: BadgeCheck,
      title: "International Faculty",
      description: "Learn from global experts recognized by leading arbitral institutions worldwide."
    },
    {
      icon: Award,
      title: "Accredited Certificates",
      description: "Earn certifications recognized by ICC, LCIA, CIArb and major arbitration bodies."
    },
    {
      icon: Clock,
      title: "Flexible Learning",
      description: "Learn at your own pace with 24/7 access to self-paced and live content on any device."
    },
    {
      icon: TrendingUp,
      title: "Hybrid Teaching",
      description: "Mix of self-paced modules with live webinars and on-demand content."
    },
    {
      icon: Globe,
      title: "Global Community",
      description: "Connect with over 4,800 professionals from 38 jurisdictions worldwide."
    },
    {
      icon: Sparkles,
      title: "Career Advancement",
      description: "Proven track record of helping members secure roles at top law firms and tribunals."
    },
  ];

  return (
    <section ref={ref} className={`py-20 bg-white transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Learn With CIMA?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience world-class ADR education designed for busy professionals
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="text-center p-6 rounded-xl hover:bg-gray-50 transition-all duration-300">
                <div className="w-16 h-16 bg-[#8b0000]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-[#8b0000]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
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
      name: "Kwame Appiah",
      role: "International Arbitrator",
      company: "Pinsent Masons",
      rating: 5
    },
    {
      quote: "CIMA Learn allowed me to learn while working full time. The flexible schedule and live sessions were perfect for my career.",
      name: "Aisha Yusuf",
      role: "Senior Counsel",
      company: "Baker McKenzie",
      rating: 5
    },
    {
      quote: "A sophisticated programme that bridges theory and real-world practice. Worth every penny for career development.",
      name: "David Okoro",
      role: "Partner",
      company: "Hill Dickinson",
      rating: 5
    },
  ];

  return (
    <section ref={ref} className={`py-20 bg-gray-50 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">What Our Learners Say</h2>
            <p className="text-gray-600">Hear from professionals who advanced their careers with CIMA</p>
          </div>
          <button className="text-[#8b0000] font-semibold hover:underline flex items-center gap-1">
            View all testimonials
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                <div className="w-12 h-12 rounded-full bg-[#8b0000] flex items-center justify-center text-white font-bold">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-xs text-gray-500">{testimonial.company}</p>
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
          <button className="text-[#8b0000] font-semibold hover:underline flex items-center gap-1">
            View all programs
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((program, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              {/* Date Badge */}
              <div className="bg-[#8b0000] text-white text-center py-4">
                <p className="text-3xl font-bold">{program.date}</p>
                <p className="text-sm uppercase tracking-wide">{program.month}</p>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#8b0000] transition min-h-[3rem]">
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
                <button className="w-full bg-[#8b0000] text-white py-2 rounded-lg font-semibold hover:bg-[#6d0000] transition">
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
    <section ref={ref} className={`py-20 bg-[#8b0000] text-white transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl font-bold mb-6">Ready to advance your career in ADR?</h2>
        <p className="text-xl mb-12 max-w-3xl mx-auto opacity-90">
          Join thousands of professionals who are mastering dispute resolution with CIMA Learn
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
          <Link href="/register">
            <button className="bg-white text-[#8b0000] px-12 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-xl">
              Create Your Account
            </button>
          </Link>
          <Link href="/courses">
            <button className="border-2 border-white text-white px-12 py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition">
              Browse Courses
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-white/20 pt-12">
          <div>
            <p className="text-5xl font-bold mb-2">4,800+</p>
            <p className="text-white/80">Learners</p>
          </div>
          <div>
            <p className="text-5xl font-bold mb-2">120+</p>
            <p className="text-white/80">Charities</p>
          </div>
          <div>
            <p className="text-5xl font-bold mb-2">200+</p>
            <p className="text-white/80">Courses</p>
          </div>
          <div>
            <p className="text-5xl font-bold mb-2">98%</p>
            <p className="text-white/80">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={cimaLogo} alt="CIMA Learn" className="h-12 w-auto" />
              <div>
                <p className="text-white font-bold">CIMA Learn</p>
                <p className="text-xs text-gray-500 uppercase">Professional ADR Education</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              CIMA Learn delivers world-class arbitration and mediation education with a focus on real-world application, professional advancement, and global accreditation.
            </p>
            <div className="flex gap-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-white font-bold mb-4">Products</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/courses" className="hover:text-white transition">All Courses</Link></li>
              <li><Link href="/course-catalog" className="hover:text-white transition">Course Bundles</Link></li>
              <li><a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">All Pathways</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-bold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white transition">About CIMA</Link></li>
              <li><Link href="/become-instructor" className="hover:text-white transition">Become Instructor</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/help-center" className="hover:text-white transition">News & Insights</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-bold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help-center" className="hover:text-white transition">Help Center</Link></li>
              <li><Link href="/technical-support" className="hover:text-white transition">Technical Support</Link></li>
              <li><Link href="/academic-advising" className="hover:text-white transition">Academic Advising</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} CIMA Learn. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy-policy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition">Terms</Link>
            <Link href="/cookie-policy" className="hover:text-white transition">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
