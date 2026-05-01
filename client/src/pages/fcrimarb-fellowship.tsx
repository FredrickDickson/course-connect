import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal, StaggerContainer } from "@/components/ScrollReveal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Link } from "wouter";
import {
  Award,
  Shield,
  Star,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  ArrowRight,
  Zap,
  Scale,
  BookOpen,
  Globe,
  GraduationCap,
} from "lucide-react";

export default function FCIMarbFellowship() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <ScrollReveal direction="up" distance={40} duration={0.7}>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-sm px-4 py-1.5">
                  <Award className="w-4 h-4 mr-2" />
                  Premier Qualification
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                  FCIMArb Fellowship
                </h1>
                <p className="text-lg text-white/60 font-medium">
                  Fellow of the Center for International Mediators and Arbitrators
                </p>
                <p className="text-white/80 leading-relaxed">
                  The highest designation awarded by CIMA. Fellows are recognised internationally as certified arbitrators, eligible for CIMA panel listings, and authorised to train, mentor, and examine future candidates.
                </p>

                <div className="grid grid-cols-2 gap-6 py-4">
                  <div>
                    <div className="text-2xl font-bold text-amber-400">5-Day</div>
                    <div className="text-sm text-white/50">Intensive + Dissertation</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">48-Hour</div>
                    <div className="text-sm text-white/50">Expedited Route Exam</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/register">
                    <Button size="lg" className="bg-amber-500 text-white hover:bg-amber-600 font-bold px-8 shadow-lg">
                      Apply for Fellowship
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/qualification-pathway">
                    <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                      View Full Pathway
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-8 space-y-6">
                    <h3 className="text-xl font-bold text-white">Fellowship at a Glance</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Scale className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Post-Nominal</div>
                          <div className="text-sm text-white/60">FCIMArb — Certified International Arbitrator</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Duration</div>
                          <div className="text-sm text-white/60">5-day intensive + dissertation (7 days – 2 months)</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Assessment</div>
                          <div className="text-sm text-white/60">Take-home award writing examination</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Eligibility</div>
                          <div className="text-sm text-white/60">MCIMArb + 7 years ADR or 10+ legal experience</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Course Modules */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-3">Fellowship Training Modules</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Law, Practice & Procedure in Domestic and International Arbitration III
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1} threshold={0.15}>
            {[
              { icon: FileText, title: "Award Writing", desc: "Master the art of drafting enforceable arbitral awards that meet international standards." },
              { icon: Scale, title: "Mediation / Settlement & Consent Awards II", desc: "Fellow-level techniques for settlement facilitation and consent award drafting." },
              { icon: BookOpen, title: "Dissertation in Arbitration & ADR", desc: "Original research contribution to the field of international arbitration." },
              { icon: Globe, title: "Arbitral Practice in New Markets", desc: "Emerging jurisdictions, investment treaty arbitration, and cross-border challenges." },
              { icon: Users, title: "Peer Interview", desc: "Professional assessment by a panel of senior CIMA Fellows and practitioners." },
            ].map((mod, i) => (
              <Card key={i} className="border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6 space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <mod.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{mod.desc}</p>
                </CardContent>
              </Card>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Eligibility & Outcome */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-2 border-primary/15">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Shield className="w-5 h-5 text-primary" />
                    Eligibility Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "MCIMArb designation or equivalent qualification",
                    "Minimum 7 years of ADR practice experience",
                    "Or 10+ years of legal professional experience",
                    "Proven award-writing skills",
                    "Recommendation from existing CIMA Fellow (preferred)",
                  ].map((req, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{req}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-2 border-amber-500/15">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Award className="w-5 h-5 text-amber-600" />
                    Fellowship Outcomes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Certificate of Fellowship from CIMA",
                    "FCIMArb post-nominal designation",
                    "Listed on CIMA international arbitration panels",
                    "Eligible to train, mentor, and examine candidates",
                    "Priority for tribunal appointments and referrals",
                    "Lifetime fellowship status",
                  ].map((out, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Star className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">{out}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Expedited Route */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            <Card className="border-2 border-amber-500/20 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/10 to-amber-400/5 p-6 border-b border-amber-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Expedited Route to FCIMArb</h2>
                    <p className="text-sm text-muted-foreground">Fast-track for experienced practitioners</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-5">
                <p className="text-muted-foreground leading-relaxed">
                  For MCIMArb holders or equivalent with 7+ years of ADR experience or 10+ years of legal practice. Bypass the full training programme and demonstrate your competence through a focused assessment.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase text-muted-foreground">Assessment</div>
                      <div className="text-sm text-foreground">48-hour take-home award writing exam</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase text-muted-foreground">Duration</div>
                      <div className="text-sm text-foreground">48 hours (take-home)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase text-muted-foreground">Outcome</div>
                      <div className="text-sm text-foreground">FCIMArb certificate & panel listing</div>
                    </div>
                  </div>
                </div>
                <Link href="/register">
                  <Button className="bg-amber-500 text-white hover:bg-amber-600 font-semibold">
                    Apply for Expedited Route
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Progression Context */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            <h2 className="text-2xl font-bold text-foreground mb-6">Where Fellowship Fits</h2>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="font-bold text-foreground">Level</TableHead>
                    <TableHead className="font-bold text-foreground">Post Nominal</TableHead>
                    <TableHead className="font-bold text-foreground">Description</TableHead>
                    <TableHead className="font-bold text-foreground">Recognised As</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Associate</TableCell>
                    <TableCell><span className="text-muted-foreground">ACIMArb</span></TableCell>
                    <TableCell className="text-muted-foreground">Introductory knowledge; support roles</TableCell>
                    <TableCell className="text-muted-foreground">Arbitration Associate</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">Member</TableCell>
                    <TableCell><span className="text-muted-foreground">MCIMArb</span></TableCell>
                    <TableCell className="text-muted-foreground">Member-level; can participate in arbitral process</TableCell>
                    <TableCell className="text-muted-foreground">Arbitration Practitioner</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-foreground">Fellow</TableCell>
                    <TableCell><span className="text-primary font-bold">FCIMArb</span></TableCell>
                    <TableCell className="font-medium text-foreground">Fellow-level; meets global standards to sit as arbitrator</TableCell>
                    <TableCell><span className="text-amber-600 font-bold">Certified International Arbitrator</span></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Professional Standards */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-3">Professional Standards</h2>
              <p className="text-muted-foreground">All Fellows must adhere to CIMA's Code of Professional and Ethical Conduct</p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid md:grid-cols-2 gap-6" staggerDelay={0.1} threshold={0.15}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  Ethical Standards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {["Professional integrity and honesty", "Independence and impartiality", "Confidentiality protection", "Competence maintenance"].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Continuing Obligations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {["Responsible AI tool usage in ADR", "Ongoing professional development", "Data security and privacy compliance", "Bias prevention and cultural sensitivity"].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white">
        <ScrollReveal direction="up" distance={30} duration={0.7}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">Ready to Become a Fellow?</h2>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              Take the final step in your ADR career and join an elite network of certified international arbitrators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-amber-500 text-white hover:bg-amber-600 font-bold px-8 shadow-lg">
                  Apply Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                  Contact Us
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
