import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MyCertificates from "@/components/certificates/my-certificates";

export default function Certification() {
  const certificationLevels = [
    {
      title: "Foundation Certificate",
      level: "Part I (Associate)",
      duration: "2-4 weeks",
      price: "$1,250 - $1,800",
      description: "Introductory knowledge in ADR principles and practice",
      features: ["ACIMArb/ACIMed eligible", "Basic dispute analysis", "Intro to arbitration law"],
      requirements: ["Course completion", "Basic assessment", "Ethics training"],
      careers: ["ADR Assistant", "Dispute Resolution Coordinator", "Legal Support Specialist"]
    },
    {
      title: "Professional Certificate",
      level: "Part II (Member)",
      duration: "4-8 weeks",
      price: "$2,200 - $3,500",
      description: "Fellow-level skills in mediation or arbitration practice",
      requirements: ["Foundation completion", "Skills demonstration", "Case study portfolio"],
      careers: ["Certified Mediator", "Arbitration Specialist", "Corporate Dispute Manager"]
    },
    {
      title: "FCIMArb Fellowship",
      level: "Part III (Fellow)",
      duration: "12 weeks",
      price: "$4,750",
      description: "Premier qualification with international recognition",
      requirements: ["Professional certification", "Comprehensive portfolio", "Peer evaluation"],
      careers: ["International Arbitrator", "Senior Mediator", "ADR Consultant"],
      featured: true
    }
  ];

  const certificationProcess = [
    {
      step: 1,
      title: "Course Enrollment",
      description: "Select and enroll in appropriate CIMA certification program",
      icon: "fas fa-user-plus"
    },
    {
      step: 2,
      title: "Skills Training", 
      description: "Complete skills-based competency training courses",
      icon: "fas fa-graduation-cap"
    },
    {
      step: 3,
      title: "Assessment",
      description: "Demonstrate competency through practical exercises",
      icon: "fas fa-tasks"
    },
    {
      step: 4,
      title: "Ethics Certification",
      description: "Complete mandatory Professional and Ethical Conduct training",
      icon: "fas fa-shield-alt"
    },
    {
      step: 5,
      title: "Certificate Issuance",
      description: "Receive official certification within 14 days of completion",
      icon: "fas fa-certificate"
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
        <div className="space-y-16">
          <MyCertificates />
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground" data-testid="title">Professional Certification</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Earn internationally recognized credentials in alternative dispute resolution through our comprehensive certification programs.
            </p>
          </div>

          {/* Certification Levels */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-foreground text-center">Certification Pathways</h2>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {certificationLevels.map((cert, index) => (
                <Card 
                  key={index} 
                  className={`hover:shadow-lg transition-shadow relative ${cert.featured ? 'ring-2 ring-primary' : ''}`}
                  data-testid={`cert-${cert.level.toLowerCase().replace(' ', '-')}`}
                >
                  {cert.featured && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        <i className="fas fa-star mr-1"></i>
                        Premier
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="space-y-2">
                      <Badge variant="secondary" className="text-xs w-fit">
                        {cert.level}
                      </Badge>
                      <CardTitle className="text-xl">{cert.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span><i className="fas fa-clock mr-1"></i>{cert.duration}</span>
                        <span><i className="fas fa-dollar-sign mr-1"></i>{cert.price}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground">{cert.description}</p>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Requirements:</h4>
                      <ul className="space-y-1">
                        {cert.requirements.map((req, reqIndex) => (
                          <li key={reqIndex} className="flex items-center space-x-2 text-sm">
                            <i className="fas fa-check text-primary text-xs"></i>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Career Opportunities:</h4>
                      <div className="flex flex-wrap gap-1">
                        {cert.careers.map((career, careerIndex) => (
                          <Badge key={careerIndex} variant="outline" className="text-xs">
                            {career}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90"
                      data-testid={`button-apply-${cert.level.toLowerCase().replace(' ', '-')}`}
                    >
                      Start Certification
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Certification Process */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Certification Process</h2>
              <p className="text-lg text-muted-foreground">
                Our structured approach ensures comprehensive skill development and professional readiness
              </p>
            </div>

            <div className="space-y-6">
              {certificationProcess.map((process, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                          <i className={process.icon}></i>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-medium text-primary">Step {process.step}</span>
                          <h3 className="text-xl font-semibold text-foreground">{process.title}</h3>
                        </div>
                        <p className="text-muted-foreground">{process.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Professional Standards */}
          <section className="bg-muted/30 rounded-xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Professional Standards</h2>
              <p className="text-lg text-muted-foreground">
                All certified professionals must adhere to CIMA's Code of Professional and Ethical Conduct
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    <i className="fas fa-user-tie text-primary text-2xl mb-2"></i>
                    <div>Professional Behavior</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Uphold dignity and professionalism in all ADR processes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    <i className="fas fa-balance-scale text-primary text-2xl mb-2"></i>
                    <div>Independence</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Maintain impartiality and disclose any conflicts of interest
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">
                    <i className="fas fa-lock text-primary text-2xl mb-2"></i>
                    <div>Confidentiality</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Protect sensitive information and respect privacy
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Certificate Timeline */}
          <section className="text-center space-y-8">
            <h2 className="text-3xl font-bold text-foreground">Certificate Issuance</h2>
            
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <i className="fas fa-clock text-primary text-4xl"></i>
                  <h3 className="text-2xl font-bold text-foreground">14-Day Guarantee</h3>
                  <p className="text-muted-foreground">
                    Upon fulfilling all course requirements including full fee payment and completion of assignments, 
                    students will receive their certificate within 14 days from the date of completion.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <i className="fas fa-credit-card text-primary mb-2"></i>
                      <div className="text-sm font-medium">Payment</div>
                    </div>
                    <div className="text-center">
                      <i className="fas fa-tasks text-primary mb-2"></i>
                      <div className="text-sm font-medium">Completion</div>
                    </div>
                    <div className="text-center">
                      <i className="fas fa-certificate text-primary mb-2"></i>
                      <div className="text-sm font-medium">Certificate</div>
                    </div>
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