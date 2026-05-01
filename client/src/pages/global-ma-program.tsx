import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GlobalMAProgram() {
  const programModules = [
    {
      title: "Cross-Border M&A Arbitration",
      duration: "3 weeks",
      description: "Complex dispute resolution in international mergers and acquisitions",
      topics: ["Due Diligence Disputes", "Earn-out Conflicts", "Warranty Claims", "Valuation Disputes"]
    },
    {
      title: "Regulatory Compliance",
      duration: "2 weeks", 
      description: "Navigate international regulatory frameworks in M&A transactions",
      topics: ["Competition Law", "Securities Regulation", "Cross-border Compliance", "Regulatory Arbitration"]
    },
    {
      title: "Cultural Competency", 
      duration: "2 weeks",
      description: "Understanding cultural dynamics in international business disputes",
      topics: ["Cultural Intelligence", "Communication Styles", "Negotiation Approaches", "Regional Practices"]
    },
    {
      title: "Technology & Innovation",
      duration: "1 week",
      description: "Modern technology applications in M&A dispute resolution",
      topics: ["Digital Due Diligence", "AI in Valuations", "Virtual Hearings", "Data Security"]
    }
  ];

  const careerOutcomes = [
    "M&A Arbitrator specialization",
    "Corporate legal advisor",
    "Investment banking disputes counsel", 
    "International transaction mediator",
    "Cross-border compliance specialist"
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

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white border-white/30">
                  Specialized Program
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight" data-testid="title">
                  Global M&A Program
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Master the complexities of mergers and acquisitions dispute resolution in international markets.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold">8 Weeks</div>
                  <div className="text-blue-200">Program Duration</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">$3,500</div>
                  <div className="text-blue-200">Investment</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  data-testid="button-enroll"
                  className="bg-amber-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-lg"
                >
                  Enroll in Program
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-white/30 bg-white/10 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-900 transition-colors backdrop-blur-sm"
                  data-testid="button-download-curriculum"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Curriculum
                </Button>
              </div>
            </div>

            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Global business and M&A transactions" 
                className="rounded-xl shadow-lg w-full"
                data-testid="img-ma-hero"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-16">
          {/* Program Overview */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Program Overview</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Develop specialized expertise in resolving complex disputes arising from international mergers and acquisitions.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <i className="fas fa-handshake text-primary"></i>
                    <span>Deal Disputes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Master resolution of M&A transaction disputes including breach of warranties, earn-out disagreements, and closing condition conflicts.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <i className="fas fa-globe text-primary"></i>
                    <span>Cross-Border Expertise</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Navigate multi-jurisdictional regulatory frameworks and cultural considerations in international transactions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <i className="fas fa-chart-line text-primary"></i>
                    <span>Valuation Methods</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Fellow-level techniques for resolving valuation disputes and damage calculations in complex M&A scenarios.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Program Modules */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-foreground text-center">Program Modules</h2>
            
            <div className="space-y-6">
              {programModules.map((module, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{module.title}</CardTitle>
                        <p className="text-muted-foreground mt-2">{module.description}</p>
                      </div>
                      <Badge variant="outline">{module.duration}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium">Key Topics:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {module.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-center space-x-2">
                            <i className="fas fa-check text-primary text-sm"></i>
                            <span className="text-sm text-muted-foreground">{topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Career Outcomes */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">Career Outcomes</h2>
              <p className="text-lg text-muted-foreground">
                Graduates are positioned for specialized roles in M&A dispute resolution
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {careerOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <i className="fas fa-arrow-right text-primary"></i>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Industry Recognition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    This specialized program is recognized by leading investment banks, law firms, and multinational corporations worldwide.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-star text-accent"></i>
                      <span className="text-sm">CIMA Professional Certification</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-star text-accent"></i>
                      <span className="text-sm">Industry-recognized credentials</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-star text-accent"></i>
                      <span className="text-sm">Global network access</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}