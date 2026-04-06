import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  ArrowRight,
  Zap,
  Scale,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

function PathwayCard({
  icon: Icon,
  iconColor,
  borderColor,
  bgColor,
  title,
  postNominal,
  badgeColor,
  subtitle,
  course,
  duration,
  format,
  assessment,
  modules,
  eligibility,
  outcome,
}: {
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  title: string;
  postNominal: string;
  badgeColor: string;
  subtitle: string;
  course: string;
  duration: string;
  format?: string;
  assessment: string;
  modules: string[];
  eligibility: string;
  outcome: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`overflow-hidden border-2 ${borderColor} transition-all hover:shadow-lg`}>
        <CollapsibleTrigger className="w-full text-left">
          <div className={`${bgColor} p-6 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${bgColor} border-2 ${borderColor} flex items-center justify-center`}>
                <Icon className={`w-7 h-7 ${iconColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <Badge className={`${badgeColor} text-xs font-bold`}>{postNominal}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-6 space-y-5 border-t border-border/50">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Course</h4>
              <p className="text-foreground font-medium">{course}</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">Duration</div>
                  <div className="text-sm text-foreground">{duration}</div>
                </div>
              </div>
              {format && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Format</div>
                    <div className="text-sm text-foreground">{format}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">Assessment</div>
                  <div className="text-sm text-foreground">{assessment}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Modules</h4>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {modules.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Eligibility</h4>
                <p className="text-sm text-foreground">{eligibility}</p>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Outcome</h4>
                <p className="text-sm text-foreground">{outcome}</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ExpeditedCard({
  title,
  description,
  assessment,
  passMark,
  outcome,
}: {
  title: string;
  description: string;
  assessment: string;
  passMark?: string;
  outcome: string;
}) {
  return (
    <Card className="border-2 border-amber-500/20 hover:border-amber-500/40 transition-all hover:shadow-lg">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-foreground"><strong>Assessment:</strong> {assessment}</span>
          </div>
          {passMark && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span className="text-foreground"><strong>Pass mark:</strong> {passMark}</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Award className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-foreground"><strong>Outcome:</strong> {outcome}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QualificationPathway() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm text-sm px-5 py-2">
            <Scale className="w-4 h-4 mr-2 text-amber-400" />
            CIMA Professional Development
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            CIMA Qualification Pathway
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Structured Courses and Eligibility Requirements for Each Level
          </p>
          <p className="text-amber-400 font-semibold text-lg">
            Learning Becomes Leadership — Join Professionals in 33+ Countries
          </p>
        </div>
      </section>

      {/* ====== ARBITRATION PATHWAY ====== */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <Scale className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Arbitration Pathway</h2>
          </div>

          <div className="space-y-4">
            <PathwayCard
              icon={Shield}
              iconColor="text-primary"
              borderColor="border-primary/15"
              bgColor="bg-primary/5"
              title="Associate"
              postNominal="ACIMArb"
              badgeColor="bg-primary text-primary-foreground"
              subtitle="Foundation Level"
              course="Law, Practice & Procedure in Domestic and International Arbitration"
              duration="2–3 days"
              format="In-person / Virtual"
              assessment="Multiple choice"
              modules={[
                "Introduction to Arbitration & ADR",
                "Arbitration Agreements",
                "Domestic and International Legal Framework",
                "Arbitration Proceedings and Practice",
                "Recognition and Enforcement of Foreign Awards",
                "Arbitral Practice (International)",
                "Exercises, Group Work, Mock Arbitrations",
              ]}
              eligibility="All professionals (law/non-law), no prior ADR training required"
              outcome="Certificate of Completion, eligible for ACIMArb, progress to Member level"
            />

            <PathwayCard
              icon={Star}
              iconColor="text-amber-600"
              borderColor="border-amber-500/15"
              bgColor="bg-amber-500/5"
              title="Member"
              postNominal="MCIMArb"
              badgeColor="bg-amber-500 text-white"
              subtitle="Applied Practice"
              course="Law, Practice & Procedure in Domestic and International Arbitration II"
              duration="3–5 days"
              assessment="Written or Exemption Exam"
              modules={[
                "Law of Obligations / Business Law",
                "Arbitration Case Management (Accra Rules)",
                "Ethics / Cybersecurity / AI in ADR",
                "Mediation Law and Practice",
                "Arbitral Practice (Selected Jurisdictions)",
                "Mock Arbitrations & Mediations",
              ]}
              eligibility="ACIMArb required, all professionals"
              outcome="Certificate of Membership, eligible for FCIMArb"
            />

            <PathwayCard
              icon={Award}
              iconColor="text-primary"
              borderColor="border-primary/20"
              bgColor="bg-gradient-to-r from-primary/5 to-amber-500/5"
              title="Fellow"
              postNominal="FCIMArb"
              badgeColor="bg-primary text-primary-foreground"
              subtitle="Mastery Level"
              course="Law, Practice & Procedure in Domestic and International Arbitration III"
              duration="5-day intensive + dissertation (7 days – 2 months)"
              assessment="Take-home award writing"
              modules={[
                "Award Writing",
                "Mediation / Settlement & Consent Awards II",
                "Dissertation in Arbitration & ADR",
                "Arbitral Practice in New Markets",
                "Peer Interview",
              ]}
              eligibility="MCIMArb or equivalent, 7+ years ADR or 10+ legal experience, proven award-writing skills"
              outcome="Certificate of Fellowship, FCIMArb post-nominal, listed on CIMA panels, eligible to train/mentor/examine"
            />
          </div>

          {/* Expedited Routes */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Expedited Routes
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <ExpeditedCard
                title="Expedited Route to MCIMArb"
                description="Fast-track for LL.M holders, ACIMArb members, and experienced legal professionals."
                assessment="14-day take-home assessment (scenario-based)"
                passMark="50%"
                outcome="MCIMArb certificate upon passing"
              />
              <ExpeditedCard
                title="Expedited Route to FCIMArb"
                description="For MCIMArb or equivalent with 7+ years ADR / 10+ legal experience."
                assessment="48-hour take-home award writing exam"
                outcome="FCIMArb certificate, panel listing"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ====== PROGRESSION TABLE ====== */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Arbitration Progression</h2>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="font-bold text-foreground">Level</TableHead>
                  <TableHead className="font-bold text-foreground">Course Title</TableHead>
                  <TableHead className="font-bold text-foreground">Eligibility</TableHead>
                  <TableHead className="font-bold text-foreground">Post Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Associate</TableCell>
                  <TableCell>Introduction to Law, Practice & Procedure in Arbitration</TableCell>
                  <TableCell>Open to all; no prior ADR experience</TableCell>
                  <TableCell><span className="text-primary font-bold">ACIMArb</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Member</TableCell>
                  <TableCell>Advanced Law, Practice & Procedure in International Arb.</TableCell>
                  <TableCell>ACIMArb or equivalent; legal training</TableCell>
                  <TableCell><span className="text-primary font-bold">MCIMArb</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fellow</TableCell>
                  <TableCell>Qualifying Route to Fellowship</TableCell>
                  <TableCell>MCIMArb or 10+ years ADR/legal practice</TableCell>
                  <TableCell><span className="text-primary font-bold">FCIMArb</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>

      {/* ====== OVERVIEW TABLE ====== */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Overview of CIMA Levels</h2>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="font-bold text-foreground">Level</TableHead>
                  <TableHead className="font-bold text-foreground">Post Nominal</TableHead>
                  <TableHead className="font-bold text-foreground">Qualification Description</TableHead>
                  <TableHead className="font-bold text-foreground">Recognised As</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Associate</TableCell>
                  <TableCell><span className="text-primary font-bold">ACIMArb</span></TableCell>
                  <TableCell>Introductory knowledge; suitable for support roles</TableCell>
                  <TableCell><span className="text-amber-600 font-semibold">Arbitration Associate</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Member</TableCell>
                  <TableCell><span className="text-primary font-bold">MCIMArb</span></TableCell>
                  <TableCell>Intermediate; can participate in arbitral process</TableCell>
                  <TableCell><span className="text-amber-600 font-semibold">Arbitration Practitioner</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fellow</TableCell>
                  <TableCell><span className="text-primary font-bold">FCIMArb</span></TableCell>
                  <TableCell>Advanced; meets global standards to sit as arbitrator</TableCell>
                  <TableCell><span className="text-amber-600 font-semibold">Certified International Arbitrator</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>

      {/* ====== MEDIATION PATHWAY ====== */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Mediation Pathway</h2>
          </div>

          <div className="space-y-4">
            <PathwayCard
              icon={Shield}
              iconColor="text-primary"
              borderColor="border-primary/15"
              bgColor="bg-primary/5"
              title="Associate"
              postNominal="ACIMed"
              badgeColor="bg-primary text-primary-foreground"
              subtitle="Foundation Level"
              course="Introduction to Mediation Law and Practice"
              duration="3 days"
              format="In-person / Virtual"
              assessment="Multiple choice assessment"
              modules={[
                "Introduction to Mediation",
                "Mediation Skills & Techniques",
                "Negotiation Theory",
                "Conflict Resolution",
                "Simulated Mediation Exercises",
              ]}
              eligibility="Open to all professionals, no prior mediation training required"
              outcome="Certificate of Completion, eligible for ACIMed designation"
            />

            <PathwayCard
              icon={Star}
              iconColor="text-amber-600"
              borderColor="border-amber-500/15"
              bgColor="bg-amber-500/5"
              title="Member"
              postNominal="MCIMed"
              badgeColor="bg-amber-500 text-white"
              subtitle="Applied Practice"
              course="Advanced Mediation Law, Practice and Procedure"
              duration="5 days"
              assessment="Simulated mediation + written assessment"
              modules={[
                "Advanced Mediation Techniques",
                "Cross-Cultural Mediation",
                "Commercial Mediation",
                "Family & Community Mediation",
                "Online Dispute Resolution",
                "Simulated Mediations & Assessments",
              ]}
              eligibility="ACIMed required"
              outcome="Certificate of Membership, eligible for FCIMed"
            />

            <PathwayCard
              icon={Award}
              iconColor="text-primary"
              borderColor="border-primary/20"
              bgColor="bg-gradient-to-r from-primary/5 to-amber-500/5"
              title="Fellow"
              postNominal="FCIMed"
              badgeColor="bg-primary text-primary-foreground"
              subtitle="Mastery Level"
              course="Qualifying Route to Mediation Fellowship"
              duration="6–8 days + dissertation"
              assessment="Dissertation + supervised mediation practice"
              modules={[
                "Advanced Dispute Systems Design",
                "Mediation Advocacy",
                "Restorative Justice Practices",
                "Dissertation in Mediation & ADR",
                "Supervised Mediation Practice",
              ]}
              eligibility="MCIMed + 20 mediations or 10 years mediation experience"
              outcome="Certificate of Fellowship, FCIMed post-nominal, listed on CIMA mediation panels"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold">Begin Your Professional Journey</h2>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            Choose your pathway and join an international community of ADR professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-amber-500 text-white hover:bg-amber-600 font-bold px-8 shadow-lg">
                Register Now
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
      </section>

      <Footer />
    </div>
  );
}
