import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import cimaLogo from "/images/logo.jpeg";
import { ArrowRight, Award, BookOpen, CheckCircle, Clock, Globe, Gavel, Star, Users, Calendar, MapPin, Heart, TrendingUp, BadgeCheck, Scale, GraduationCap, BrainCircuit, Sparkles, Download, FileText, Mail, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { PwaInstallButton } from "@/components/pwa-install-button";

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
        setLocation("/home");
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
      <div className="bg-[#610000] text-white text-center py-3 px-4">
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
                <p className="text-sm font-semibold text-[#610000] whitespace-nowrap leading-tight font-display">CIMA Learn</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider whitespace-nowrap leading-tight font-body">Professional ADR</p>
              </div>
            </Link>

            {/* Navigation with Search */}
            <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
              <a href="#categories" className="text-base text-gray-700 hover:text-[#610000] transition font-medium whitespace-nowrap font-body">Categories</a>
              
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
                  className="w-full py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#8b0000] focus:border-transparent focus:bg-white transition-all font-body"
                />
              </form>
              
              <Link href="/courses" className="text-base text-gray-700 hover:text-[#610000] transition font-medium whitespace-nowrap font-body">Learning Pathways</Link>
              <Link href="/community" className="text-base text-gray-700 hover:text-[#610000] transition font-medium whitespace-nowrap font-body">Live Sessions</Link>
              <Link href="/resources" className="text-base text-gray-700 hover:text-[#610000] transition font-medium whitespace-nowrap font-body">Resources</Link>
            </nav>

            {/* CTA Buttons - Far Right */}
            <div className="flex items-center gap-3 flex-shrink-0 pr-2">
              <PwaInstallButton className="hidden md:inline-flex" />
              <Link href="/login" className="text-base text-gray-700 hover:text-[#610000] transition font-medium whitespace-nowrap font-body">
                Login
              </Link>
              <Link href="/register" className="bg-[#610000] text-white px-6 py-2 rounded-md text-base font-semibold hover:bg-[#8b0000] transition whitespace-nowrap font-body shadow-sm hover:shadow-md">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />
        <StatsBarSection />
        <FeaturedCoursesSection />
        <LearningPathwaysSection />
        <WhyLearnWithCIMASection />
        <BrochureDownloadSection />
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
    <section ref={ref} className={`relative h-[92vh] flex items-center justify-center overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Ultra-Sharp Background Image - Higher resolution */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=2880&h=1800&auto=format&fit=crop&q=100"
          alt="Professional legal workspace"
          className="w-full h-full object-cover"
          loading="eager"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      {/* Minimalist Text Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="max-w-4xl">
          {/* Large Headline - Microsoft Fluent Typography */}
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-light text-white leading-[0.92] mb-10 tracking-tight font-display">
            Master dispute<br />
            resolution
          </h1>

          {/* Minimal CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5">
            <Link href="/courses">
              <button className="group bg-white text-[#610000] px-12 py-5 rounded-md font-semibold text-lg hover:bg-gray-100 transition-all shadow-2xl flex items-center justify-center gap-3 font-body">
                Explore Courses
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
              <button className="group border-2 border-white/90 text-white px-12 py-5 rounded-md font-semibold text-lg hover:bg-white hover:text-[#610000] transition-all flex items-center justify-center gap-3 backdrop-blur-md font-body">
                Learning Pathways
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Floating Stats Card - High Contrast */}
      <div className="absolute bottom-10 right-10 bg-white backdrop-blur-xl rounded-xl p-8 shadow-2xl border border-gray-200 hidden xl:block">
        <div className="flex items-center gap-8">
          <div className="text-center border-r border-gray-300 pr-8">
            <p className="text-4xl font-semibold text-[#610000] font-display">4,800+</p>
            <p className="text-sm text-gray-900 mt-1 font-body font-medium">Learners</p>
          </div>
          <div className="text-center border-r border-gray-300 pr-8">
            <p className="text-4xl font-semibold text-[#610000] font-display">120+</p>
            <p className="text-sm text-gray-900 mt-1 font-body font-medium">Charities</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-semibold text-[#610000] font-display">98%</p>
            <p className="text-sm text-gray-900 mt-1 font-body font-medium">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Stats Bar Section
function StatsBarSection() {
  return (
    <section className="relative py-20 border-b border-gray-100 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=2880&h=800&auto=format&fit=crop&q=100"
          alt="Professional team collaboration"
          className="w-full h-full object-cover opacity-30"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/60 to-white/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          <div className="group text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-[#610000]" />
            </div>
            <p className="text-5xl lg:text-6xl font-light text-gray-900 mb-2 font-display">4,800+</p>
            <p className="text-base text-gray-700 font-body font-medium">Learners Worldwide</p>
          </div>
          
          <div className="group text-center">
            <div className="flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-pink-600" />
            </div>
            <p className="text-5xl lg:text-6xl font-light text-gray-900 mb-2 font-display">120+</p>
            <p className="text-base text-gray-700 font-body font-medium">Charitable Partners</p>
          </div>
          
          <div className="group text-center">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-5xl lg:text-6xl font-light text-gray-900 mb-2 font-display">200+</p>
            <p className="text-base text-gray-700 font-body font-medium">Expert-Led Courses</p>
          </div>
          
          <div className="group text-center">
            <div className="flex items-center justify-center mb-4">
              <Star className="w-10 h-10 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-5xl lg:text-6xl font-light text-gray-900 mb-2 font-display">98%</p>
            <p className="text-base text-gray-700 font-body font-medium">Satisfaction Rate</p>
          </div>
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
    <section ref={ref} id="categories" className={`relative py-24 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=2880&h=1000&auto=format&fit=crop&q=100"
          alt="Modern library with books"
          className="w-full h-full object-cover opacity-20"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/70 to-white" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-16">
          <div>
            <h2 className="text-5xl font-light text-gray-900 mb-2 font-display">Featured Courses</h2>
          </div>
          <Link href="/courses">
            <button className="text-[#610000] font-semibold hover:underline flex items-center gap-2 text-lg font-body">
              View all
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {courses.map((course, index: number) => (
            <Link key={course.id} href={`/course/${course.id}`}>
              <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer h-full relative">
                {/* Badge - Fixed positioning */}
                {index === 0 && (
                  <div className="absolute top-5 left-5 bg-[#610000] text-white px-4 py-2 rounded-md text-sm font-semibold z-20 font-body">
                    Featured
                  </div>
                )}
                
                {/* Large Sharp Image */}
                <div className="relative h-64 overflow-hidden">
                  <CourseThumbnail
                    src={course.thumbnail_url}
                    fallbackSrc="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&auto=format&fit=crop&q=95&sharp=10"
                    alt={course.title}
                    className="w-full h-full"
                    imgClassName="group-hover:scale-125 transition-transform duration-500"
                  />
                </div>

                {/* Minimal Content */}
                <div className="p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-[#610000] transition font-display">
                    {course.title}
                  </h3>
                  <p className="text-base text-gray-700 mb-4 font-body font-medium">
                    {course.instructor?.first_name} {course.instructor?.last_name}
                  </p>
                  <button className="mt-4 w-full bg-[#610000] text-white py-3 rounded-md font-semibold hover:bg-[#8b0000] transition text-base font-body">
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
    <section className="py-12 bg-white border-y-4 border-[#610000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[#610000] mb-4">SEARCH BAR IS HERE</h2>
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
              className="w-full py-5 pl-16 pr-6 text-base text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#610000] focus:border-[#610000] transition-all hover:border-gray-300"
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
      title: "1. Commercial Mediation & Settlement",
      description:
        "Develop advanced skills for resolving contractual, corporate and commercial disputes through structured negotiation, mediation and settlement.",
    },
    {
      icon: Users,
      title: "2. Employment & Workplace Mediation",
      description:
        "Develop practical expertise in managing employee grievances, executive conflict, workplace relationships and organisational disputes.",
    },
    {
      icon: GraduationCap,
      title: "3. Construction Mediation",
      description:
        "Build specialist competence in resolving payment, delay, variation, property, contractual and project disputes arising from construction and infrastructure projects.",
    },
    {
      icon: Globe,
      title: "4. Mediation Advocacy for Lawyers",
      description:
        "Learn to represent clients effectively in mediation through case preparation, opening strategy, negotiation, caucusing, risk assessment and settlement documentation.",
    },
    {
      icon: BrainCircuit,
      title: "5. AI, Online Mediation & Digital Dispute Resolution",
      description:
        "Develop practical skills in using AI and digital platforms for dispute analysis, case preparation, negotiation support, online mediation and settlement processes.",
    },
  ];

  return (
    <section ref={ref} className={`relative py-24 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=2880&h=1000&auto=format&fit=crop&q=100"
          alt="Professional business planning"
          className="w-full h-full object-cover opacity-25"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/70 via-gray-50/75 to-white/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-light text-gray-900 mb-4 font-display tracking-tight">Learning Pathways</h2>
        </div>

        <div className="text-center mb-10">
          <h3 className="text-3xl font-light text-gray-900 font-display">CIMA Specialist Certificate Programmes</h3>
        </div>

        <div className="mb-10 text-center">
          <p className="text-2xl font-light text-gray-900 font-display">Specialist Courses</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {pathways.map((pathway, index) => {
            const Icon = pathway.icon;
            return (
              <div
                key={index}
                className="bg-[#610000] rounded-[20px] p-8 md:p-10 shadow-[0_12px_28px_rgba(97,0,0,0.18)] border border-[#7f1d1d] min-h-[360px] flex flex-col items-center justify-center text-center hover:translate-y-[-2px] transition-transform duration-300"
              >
                <div className="w-20 h-20 bg-[#f5f1f0] rounded-[18px] flex items-center justify-center mb-7 shadow-inner">
                  <Icon className="w-9 h-9 text-[#610000]" />
                </div>

                <h3 className="text-3xl md:text-[2.1rem] font-semibold text-white leading-tight font-display mb-5">
                  {pathway.title}
                </h3>

                <p className="text-lg md:text-xl text-white/90 leading-relaxed font-body max-w-[28rem]">
                  {pathway.description}
                </p>
              </div>
            );
          })}
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
    },
    {
      icon: Award,
      title: "Accredited Certificates",
    },
    {
      icon: Clock,
      title: "Flexible Learning",
    },
    {
      icon: TrendingUp,
      title: "Hybrid Teaching",
    },
    {
      icon: Globe,
      title: "Global Community",
    },
    {
      icon: Sparkles,
      title: "Career Advancement",
    },
  ];

  return (
    <section ref={ref} className={`relative py-24 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=2880&h=1000&auto=format&fit=crop&q=100"
          alt="Students collaborating and learning"
          className="w-full h-full object-cover opacity-20"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/80 to-white" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-light text-gray-900 mb-4 font-display">Why Learn With CIMA?</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="text-center p-8 rounded-lg hover:bg-gray-50 transition-all duration-300">
                <div className="w-20 h-20 bg-[#610000]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-10 h-10 text-[#610000]" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 font-display">
                  {benefit.title}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Brochure Download Section - Enterprise-grade design inspired by Meta, Microsoft, Salesforce
function BrochureDownloadSection() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save download data and send email via API
      const response = await fetch('/api/brochure-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          organization: organization.trim() || null,
        }),
      });
      // Be defensive: the server may return HTML error pages (404/500) —
      // avoid trying to parse non-JSON as JSON which throws and breaks UX.
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Fallback: read as text so we can show a sensible error message
        const txt = await response.text();
        data = { error: txt };
      }

      if (!response.ok) {
        console.error('Brochure API non-ok response:', response.status, data);
        throw new Error(data.error || 'Failed to send brochure');
      }

      setIsSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setEmail("");
        setFullName("");
        setOrganization("");
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="inline-flex items-center gap-2 bg-[#610000]/10 text-[#610000] px-4 py-2 rounded-full text-sm font-semibold font-body">
              <FileText className="w-4 h-4" />
              Professional Resources
            </div>

            {/* Headline - Microsoft Fluent Style */}
            <div>
              <h2 className="text-5xl lg:text-6xl font-light text-gray-900 mb-6 font-display leading-tight">
                Get our complete
                <br />
                <span className="text-[#610000] font-semibold">programme brochure</span>
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
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#610000]/10 flex items-center justify-center mt-1">
                      <Icon className="w-4 h-4 text-[#610000]" />
                    </div>
                    <p className="text-lg text-gray-800 font-body font-medium">{feature.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Trust Signals - Meta Style */}
            <div className="flex flex-wrap items-center gap-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center shadow-lg">
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

          {/* Right Column - Form Card - Salesforce/HubSpot Inspired */}
          <div className="lg:pl-8">
            <div className="bg-white rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.08)] border border-gray-100 p-8 lg:p-10 relative overflow-hidden">
              {/* Decorative Element */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#610000]/5 to-transparent rounded-full blur-3xl" />
              
              <div className="relative">
                {!isSuccess ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#610000] to-[#8b0000] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Download className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-display">Download Your Copy</h3>
                      <p className="text-base text-gray-600 font-body">Fill in your details to receive instant access</p>
                    </div>

                    <form onSubmit={handleDownload} className="space-y-5">
                      {/* Full Name Input */}
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2 font-body">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="w-full px-4 py-3.5 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#610000] focus:border-transparent focus:bg-white transition-all font-body placeholder:text-gray-400"
                          placeholder="John Doe"
                        />
                      </div>

                      {/* Email Input */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2 font-body">
                          Work Email *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-3.5 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#610000] focus:border-transparent focus:bg-white transition-all font-body placeholder:text-gray-400"
                            placeholder="john@company.com"
                          />
                        </div>
                      </div>

                      {/* Organization Input */}
                      <div>
                        <label htmlFor="organization" className="block text-sm font-semibold text-gray-900 mb-2 font-body">
                          Organization (Optional)
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            id="organization"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 text-base text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#610000] focus:border-transparent focus:bg-white transition-all font-body placeholder:text-gray-400"
                            placeholder="Your Law Firm or Company"
                          />
                        </div>
                      </div>

                      {/* Submit Button - Premium Design */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group w-full bg-gradient-to-r from-[#610000] to-[#8b0000] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-[0_10px_40px_rgba(97,0,0,0.3)] transition-all duration-300 flex items-center justify-center gap-3 font-body disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                            <span>Download Brochure</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      {/* Privacy Notice */}
                      <p className="text-xs text-gray-500 text-center leading-relaxed font-body">
                        By downloading, you agree to our <Link href="/privacy-policy" className="text-[#610000] hover:underline font-medium">Privacy Policy</Link>. We respect your privacy and will never share your information.
                      </p>
                    </form>
                  </>
                ) : (
                  // Success State - Apple Style
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-3xl font-semibold text-gray-900 mb-3 font-display">Success!</h3>
                    <p className="text-lg text-gray-700 mb-2 font-body">Brochure sent to your email!</p>
                    <p className="text-base text-gray-600 font-body">Check your inbox for the PDF download link</p>
                  </div>
                )}
              </div>
            </div>

            {/* Below Form CTA */}
            <p className="text-center text-base text-gray-600 mt-6 font-body">
              Questions? <Link href="/contact" className="text-[#610000] hover:underline font-semibold">Contact our team</Link>
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
    <section ref={ref} className={`relative py-24 overflow-hidden transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=2880&h=1000&auto=format&fit=crop&q=100"
          alt="Professional team meeting"
          className="w-full h-full object-cover opacity-25"
          loading="lazy"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/70 via-gray-50/75 to-white/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <h2 className="text-5xl font-light text-gray-900 mb-2 font-display">What Our Learners Say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-8 hover:shadow-2xl transition-all duration-300">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-800 mb-8 leading-relaxed text-lg font-body">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
                <div className="w-14 h-14 rounded-full bg-[#610000] flex items-center justify-center text-white font-bold text-lg font-display">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 font-display">{testimonial.name}</p>
                  <p className="text-sm text-gray-700 font-body font-medium">{testimonial.role}</p>
                  <p className="text-sm text-gray-600 font-body">{testimonial.company}</p>
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
          <button className="text-[#610000] font-semibold hover:underline flex items-center gap-1">
            View all programs
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((program, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              {/* Date Badge */}
              <div className="bg-[#610000] text-white text-center py-4">
                <p className="text-3xl font-bold">{program.date}</p>
                <p className="text-sm uppercase tracking-wide">{program.month}</p>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#610000] transition min-h-[3rem]">
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
                <button className="w-full bg-[#610000] text-white py-2 rounded-lg font-semibold hover:bg-[#8b0000] transition">
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#610000]/95 to-[#610000]/85" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-6xl font-light mb-8 font-display text-white">Ready to advance your career?</h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
          <Link href="/register">
            <button className="bg-white text-[#610000] px-14 py-5 rounded-md font-semibold text-lg hover:bg-gray-100 transition shadow-2xl font-body">
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
                <p className="text-black font-semibold text-lg font-display">CIMA Learn</p>
                <p className="text-xs text-gray-700 uppercase tracking-wider font-body">Professional ADR Education</p>
              </div>
            </div>
            <p className="text-base text-black leading-relaxed mb-6 font-body max-w-md">
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

          {/* Products */}
          <div>
            <h3 className="text-black font-semibold mb-5 text-lg font-display">Products</h3>
            <ul className="space-y-3 text-base font-body">
              <li><Link href="/courses" className="text-black hover:text-gray-600 transition">All Courses</Link></li>
              <li><Link href="/course-catalog" className="text-black hover:text-gray-600 transition">Course Bundles</Link></li>
              <li><a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-600 transition">All Pathways</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-black font-semibold mb-5 text-lg font-display">Company</h3>
            <ul className="space-y-3 text-base font-body">
              <li><Link href="/contact" className="text-black hover:text-gray-600 transition">About CIMA</Link></li>
              <li><Link href="/become-instructor" className="text-black hover:text-gray-600 transition">Become Instructor</Link></li>
              <li><Link href="/contact" className="text-black hover:text-gray-600 transition">Contact Us</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-black font-semibold mb-5 text-lg font-display">Support</h3>
            <ul className="space-y-3 text-base font-body">
              <li><Link href="/help-center" className="text-black hover:text-gray-600 transition">Help Center</Link></li>
              <li><Link href="/technical-support" className="text-black hover:text-gray-600 transition">Technical Support</Link></li>
              <li><Link href="/privacy-policy" className="text-black hover:text-gray-600 transition">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="text-black hover:text-gray-600 transition">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-base text-black font-body">© {new Date().getFullYear()} CIMA Learn. All rights reserved.</p>
          <div className="flex gap-8 text-base font-body">
            <Link href="/privacy-policy" className="text-black hover:text-gray-600 transition">Privacy</Link>
            <Link href="/terms-of-service" className="text-black hover:text-gray-600 transition">Terms</Link>
            <Link href="/cookie-policy" className="text-black hover:text-gray-600 transition">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
