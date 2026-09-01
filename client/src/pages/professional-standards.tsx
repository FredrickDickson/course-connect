import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfessionalStandards() {
  const ethicalPrinciples = [
    {
      title: "Integrity",
      description: "Act with honesty, transparency, and professional competence in all ADR processes",
      icon: "fas fa-handshake"
    },
    {
      title: "Independence", 
      description: "Maintain impartiality and disclose any conflicts of interest or bias",
      icon: "fas fa-balance-scale"
    },
    {
      title: "Competence",
      description: "Ensure qualifications and expertise are appropriate for each case undertaken",
      icon: "fas fa-graduation-cap"
    },
    {
      title: "Confidentiality",
      description: "Protect sensitive information and respect the privacy of all parties",
      icon: "fas fa-lock"
    }
  ];

  const technologyGuidelines = [
    {
      title: "AI Tool Usage",
      description: "Transparent disclosure of AI assistance in case analysis and documentation",
      requirements: ["Inform parties of AI usage", "Maintain human oversight", "Ensure accuracy"]
    },
    {
      title: "Digital Platform Security",
      description: "Secure communication and data protection in virtual proceedings",
      requirements: ["End-to-end encryption", "Access controls", "Data backup protocols"]
    },
    {
      title: "Virtual Hearing Standards", 
      description: "Professional conduct requirements for online arbitration and mediation",
      requirements: ["Technical reliability", "Professional environment", "Equal access"]
    }
  ];

  const disciplinaryProcedures = [
    {
      step: 1,
      title: "Violation Report",
      description: "Filing of formal complaint with evidence of misconduct"
    },
    {
      step: 2,
      title: "Initial Review",
      description: "Preliminary assessment by CIMA ethics committee"
    },
    {
      step: 3,
      title: "Investigation",
      description: "Comprehensive review including response from accused party"
    },
    {
      step: 4,
      title: "Disciplinary Hearing",
      description: "Formal hearing with opportunity for defense and witnesses"
    },
    {
      step: 5,
      title: "Resolution",
      description: "Final decision with appropriate sanctions or dismissal"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground" data-testid="title">Professional Standards</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              CIMA's Code of Professional and Ethical Conduct sets the highest standards for ADR professionals worldwide.
            </p>
          </div>

          {/* Code Structure */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-foreground text-center">Code Structure</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <span>Part One: Committee Members</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Standards for CIMA committee members and organizational representatives
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-primary text-xs"></i>
                      <span>Governance responsibilities</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-primary text-xs"></i>
                      <span>Institutional integrity</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-primary text-xs"></i>
                      <span>Professional representation</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <span className="text-secondary font-bold">2</span>
                    </div>
                    <span>Part Two: Neutrals</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Standards for practicing mediators and arbitrators
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-secondary text-xs"></i>
                      <span>Case conduct requirements</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-secondary text-xs"></i>
                      <span>Impartiality obligations</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fas fa-check text-secondary text-xs"></i>
                      <span>Professional competence</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Ethical Principles */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-foreground text-center">Core Ethical Principles</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ethicalPrinciples.map((principle, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <i className={`${principle.icon} text-primary text-2xl`}></i>
                    </div>
                    <CardTitle className="text-lg">{principle.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{principle.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Technology Guidelines */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-foreground text-center">Technology & AI Guidelines</h2>
            
            <div className="space-y-6">
              {technologyGuidelines.map((guideline, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <i className="fas fa-laptop text-primary"></i>
                      <span>{guideline.title}</span>
                    </CardTitle>
                    <p className="text-muted-foreground">{guideline.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Requirements:</h4>
                      <div className="grid md:grid-cols-3 gap-3">
                        {guideline.requirements.map((req, reqIndex) => (
                          <div key={reqIndex} className="flex items-center space-x-2">
                            <i className="fas fa-arrow-right text-primary text-xs"></i>
                            <span className="text-sm text-muted-foreground">{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Student Code of Conduct */}
          <section className="bg-muted/30 rounded-xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Student Code of Conduct</h2>
              <p className="text-lg text-muted-foreground">
                Academic integrity and professional behavior expectations for all CIMA students
              </p>
            </div>

            <Tabs defaultValue="academic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="academic">Academic Integrity</TabsTrigger>
                <TabsTrigger value="professional">Professional Behavior</TabsTrigger>
                <TabsTrigger value="technology">Technology Usage</TabsTrigger>
              </TabsList>
              
              <TabsContent value="academic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Honesty Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-green-700 dark:text-green-400">Required</h4>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center space-x-2">
                            <i className="fas fa-check text-green-600 text-xs"></i>
                            <span>Original work submission</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <i className="fas fa-check text-green-600 text-xs"></i>
                            <span>Proper citation of sources</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <i className="fas fa-check text-green-600 text-xs"></i>
                            <span>Individual effort on assessments</span>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-[#5A2633] dark:text-red-400">Prohibited</h4>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center space-x-2">
                            <i className="fas fa-times text-[#5A2633] text-xs"></i>
                            <span>Plagiarism or copying</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <i className="fas fa-times text-[#5A2633] text-xs"></i>
                            <span>Unauthorized collaboration</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <i className="fas fa-times text-[#5A2633] text-xs"></i>
                            <span>Fabrication of information</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="professional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Conduct Standards</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Students must maintain professional standards in all interactions and communications.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Communication Standards</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Respectful interaction with peers and faculty</li>
                          <li>• Professional email and forum etiquette</li>
                          <li>• Constructive participation in discussions</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Attendance & Participation</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Active engagement in coursework</li>
                          <li>• Timely completion of assignments</li>
                          <li>• Regular attendance at virtual sessions</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="technology" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Technology Usage Policies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Guidelines for responsible use of digital platforms and AI tools in academic work.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">AI Tool Guidelines</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Transparent disclosure of AI assistance</li>
                          <li>• Maintain academic integrity when using AI</li>
                          <li>• Ensure accuracy and originality of final work</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Platform Security</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Protect login credentials and personal data</li>
                          <li>• Use secure networks for course access</li>
                          <li>• Report security incidents immediately</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          {/* Disciplinary Procedures */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Disciplinary Procedures</h2>
              <p className="text-lg text-muted-foreground">
                Process for addressing violations of professional and academic conduct standards
              </p>
            </div>

            <div className="space-y-4">
              {disciplinaryProcedures.map((procedure, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                          {procedure.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground mb-2">{procedure.title}</h3>
                        <p className="text-muted-foreground">{procedure.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Reporting Mechanism */}
          <section className="text-center space-y-6">
            <Card className="max-w-2xl mx-auto border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <i className="fas fa-exclamation-triangle text-amber-600 text-3xl"></i>
                  <h3 className="text-xl font-bold text-foreground">Report Violations</h3>
                  <p className="text-muted-foreground">
                    If you witness or experience violations of CIMA's professional standards, 
                    please report them through our confidential reporting system.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button data-testid="button-report-violation">
                      <i className="fas fa-flag mr-2"></i>
                      Report Violation
                    </Button>
                    <Button variant="outline" data-testid="button-ethics-hotline">
                      Ethics Hotline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}