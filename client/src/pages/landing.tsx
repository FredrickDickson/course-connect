import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { ScrollReveal, StaggerContainer } from "@/components/ScrollReveal";
import { Link } from "wouter";
import {
  ArrowRight,
  Calendar,
  Users,
  Award,
  BookOpen,
  Scale,
  GraduationCap,
  ChevronRight,
  Shield,
  Star,
} from "lucide-react";

const courses = [
  {
    id: "arb-training-1",
    title: "Law, Practice and Procedure in Domestic & International Arbitration Training",
    dates: "February 25, 2026 – February 27, 2026",
    description:
      "Foundational training in domestic and international arbitration law, practice and procedure. Ideal for professionals seeking ACIMArb certification.",
    banner: "bg-gradient-to-r from-primary/10 to-primary/5",
  },
  {
    id: "arb-training-2",
    title: "Law, Practice and Procedure in Domestic & International Arbitration Training II",
    dates: "May 27, 2026 – May 29, 2026",
    description:
      "Advanced practice covering case management, ethics, cybersecurity and AI in ADR, and mediation law. For MCIMArb candidates.",
    banner: "bg-gradient-to-r from-blue-600/10 to-blue-500/5",
  },
  {
    id: "arb-training-3",
    title: "Law, Practice and Procedure in Domestic & International Arbitration Training III",
    dates: "August 26, 2026 – August 28, 2026",
    description:
      "Intensive fellowship-level training in award writing, dissertation research, and arbitral practice in new markets.",
    banner: "bg-gradient-to-r from-amber-500/10 to-amber-400/5",
  },
  {
    id: "arb-training-4",
    title: "Law, Practice and Procedure in Domestic & International Arbitration Training IV",
    dates: "November 25, 2026 – November 27, 2026",
    description:
      "Specialist modules in emerging areas of international arbitration, including investment treaty and construction disputes.",
    banner: "bg-gradient-to-r from-green-600/10 to-green-500/5",
  },
  {
    id: "expedited-fellowship",
    title: "Expedited Route to Fellowship (FCIMArb)",
    dates: "December 15, 2025 – December 31, 2025",
    description:
      "Fast-track pathway for experienced practitioners to achieve FCIMArb fellowship through a 48-hour take-home award writing examination.",
    banner: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
    featured: true,
  },
  {
    id: "advanced-arb",
    title: "Advanced Law, Practice & Procedure in Domestic and International Arbitration",
    dates: "November 26, 2025 – November 28, 2025",
    description:
      "High-level training for seasoned practitioners covering complex multi-party arbitration and cross-border enforcement.",
    banner: "bg-gradient-to-r from-primary/10 to-amber-500/10",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ====== HERO ====== */}
      <section className="relative bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <ScrollReveal direction="up" distance={40} duration={0.7}>
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm text-sm px-5 py-2">
                <Scale className="w-4 h-4 mr-2 text-amber-400" />
                Center for International Mediators and Arbitrators
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                The world's best online ADR education{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                  available from Oxfordshire.
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                Professional certification in mediation and arbitration trusted by legal practitioners in 33+ countries worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/qualification-pathway">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 shadow-lg">
                    Qualification Pathway
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal direction="up" distance={30} delay={0.3} duration={0.6}>
            <div className="grid grid-cols-3 gap-8 pt-12 border-t border-white/10 max-w-lg mx-auto mt-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">5,000+</div>
                <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Global Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">33+</div>
                <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">95%</div>
                <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Success Rate</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ====== UPCOMING COURSES ====== */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={30} duration={0.6}>
            <div className="text-center mb-14">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">All Upcoming Courses</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Structured training programmes designed for legal professionals, arbitrators, and mediators at every stage of their career.
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.1} threshold={0.15}>
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-border">
                <div className={`px-6 py-4 ${course.banner}`}>
                  {course.featured && (
                    <Badge className="bg-primary text-primary-foreground mb-2 text-[10px] uppercase tracking-widest font-bold">
                      <Award className="w-3 h-3 mr-1" />
                      Expedited Route to Fellowship
                    </Badge>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2 text-primary shrink-0" />
                    <span className={course.featured ? "text-primary-foreground/80" : ""}>{course.dates}</span>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-foreground text-lg leading-snug line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{course.description}</p>
                  <Link href="/register">
                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold group transition-all">
                      REGISTER
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </StaggerContainer>

          {/* Resource Buttons */}
          <ScrollReveal direction="up" distance={20} delay={0.2} duration={0.5}>
            <div className="grid sm:grid-cols-3 gap-4 mt-14">
              <Link href="/resources">
                <Button variant="outline" className="w-full h-14 text-sm font-bold uppercase tracking-wider border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all">
                  <BookOpen className="w-5 h-5 mr-2 text-primary" />
                  Arbitrator Resources
                </Button>
              </Link>
              <Link href="/resources">
                <Button variant="outline" className="w-full h-14 text-sm font-bold uppercase tracking-wider border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Mediator Resources
                </Button>
              </Link>
              <Link href="/resources">
                <Button variant="outline" className="w-full h-14 text-sm font-bold uppercase tracking-wider border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all">
                  <GraduationCap className="w-5 h-5 mr-2 text-primary" />
                  Practitioner Journals
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ====== QUALIFICATION PATHWAY PREVIEW ====== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={30} duration={0.6}>
            <div className="text-center mb-14">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">CIMA Qualification Pathway</h2>
              <p className="text-lg text-muted-foreground">
                Structured courses and eligibility requirements for each level
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-3 gap-8" staggerDelay={0.1} threshold={0.15}>
            {/* Associate */}
            <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/30 transition-colors">
              <div className="bg-primary/5 p-6 text-center border-b border-primary/10">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Associate</h3>
                <Badge className="mt-2 bg-primary text-primary-foreground text-xs">ACIMArb</Badge>
              </div>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">Foundation level — introduction to arbitration and ADR for all professionals.</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />2–3 day training</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />Multiple choice assessment</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />Open to all professionals</li>
                </ul>
              </CardContent>
            </Card>

            {/* Member */}
            <Card className="overflow-hidden border-2 border-amber-500/20 hover:border-amber-500/40 transition-colors">
              <div className="bg-amber-500/5 p-6 text-center border-b border-amber-500/10">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Member</h3>
                <Badge className="mt-2 bg-amber-500 text-white text-xs">MCIMArb</Badge>
              </div>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">Applied practice — case management, ethics, mediation and arbitral practice.</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />3–5 day training</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />Written or exemption exam</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />ACIMArb required</li>
                </ul>
              </CardContent>
            </Card>

            {/* Fellow */}
            <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors relative">
              <div className="absolute top-3 right-3">
                <Badge className="bg-amber-500 text-white text-[10px] uppercase tracking-wider">Mastery</Badge>
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-amber-500/5 p-6 text-center border-b border-primary/10">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Fellow</h3>
                <Badge className="mt-2 bg-primary text-primary-foreground text-xs">FCIMArb</Badge>
              </div>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">Mastery level — award writing, dissertation, and panel listing eligibility.</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />5-day intensive + dissertation</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />Take-home award writing</li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />MCIMArb + 7 years experience</li>
                </ul>
              </CardContent>
            </Card>
          </StaggerContainer>

          <ScrollReveal direction="up" distance={20} delay={0.3} duration={0.5}>
            <div className="text-center mt-10">
              <Link href="/qualification-pathway">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-10 shadow-md">
                  View Full Qualification Pathway
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary to-slate-900" />
        <ScrollReveal direction="up" distance={30} duration={0.7}>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Ready to Advance{" "}
              <span className="text-amber-400">Your Professional Career?</span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Join professionals in 33+ countries who have elevated their careers with CIMA's internationally recognised ADR programmes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-amber-500 text-white hover:bg-amber-600 font-bold px-8 shadow-lg">
                  Get Started Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/qualification-pathway">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                  Explore Pathways
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
