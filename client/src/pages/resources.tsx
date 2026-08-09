import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import StudentLayout from "@/components/student-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InstructorResourceUpload from "@/components/resources/instructor-resource-upload";
import DownloadableResources from "@/components/resources/downloadable-resources";

export default function Resources() {
  const resourceCategories = [
    {
      title: "Professional Standards",
      icon: "fas fa-shield-alt",
      description: "Ethics codes, conduct guidelines, and professional requirements",
      resources: [
        "Code of Professional and Ethical Conduct",
        "Technology and AI Usage Guidelines", 
        "Confidentiality and Data Protection Policies",
        "Professional Misconduct Procedures"
      ]
    },
    {
      title: "ADR Procedures",
      icon: "fas fa-gavel", 
      description: "Rules, procedures, and best practices for mediation and arbitration",
      resources: [
        "CIMA Arbitration Rules",
        "International Mediation Procedures",
        "Case Management Guidelines",
        "Award Enforcement Protocols"
      ]
    },
    {
      title: "Training Materials",
      icon: "fas fa-book-open",
      description: "Educational content, case studies, and skill development resources",
      resources: [
        "Skills-Based Competency Framework",
        "International Case Study Library", 
        "Practice Scenarios and Simulations",
        "Continuing Education Modules"
      ]
    },
    {
      title: "Technology Tools",
      icon: "fas fa-laptop",
      description: "Digital platforms, AI tools, and technology for modern ADR practice",
      resources: [
        "Virtual Hearing Platforms",
        "AI-Assisted Case Analysis",
        "Digital Document Management",
        "Communication and Collaboration Tools"
      ]
    },
    {
      title: "Legal Frameworks",
      icon: "fas fa-balance-scale",
      description: "International laws, treaties, and regulatory frameworks",
      resources: [
        "New York Convention Guide",
        "UNCITRAL Model Law Resources",
        "Cross-Border Enforcement Guidelines",
        "Regulatory Compliance Checklists"
      ]
    },
    {
      title: "Professional Development",
      icon: "fas fa-user-graduate",
      description: "Career advancement, networking, and continuous learning resources",
      resources: [
        "Fellowship Application Guidelines",
        "Professional Network Directory",
        "Career Pathway Maps",
        "Industry Best Practices"
      ]
    }
  ];

  const featuredResources = [
    {
      title: "CIMA Code of Conduct",
      type: "Policy Document",
      description: "Comprehensive guide to professional and ethical standards for all CIMA members",
      downloadSize: "2.3 MB",
      lastUpdated: "December 2024"
    },
    {
      title: "International Arbitration Handbook",
      type: "Training Manual",
      description: "Complete guide to international arbitration practice and procedures",
      downloadSize: "8.7 MB", 
      lastUpdated: "November 2024"
    },
    {
      title: "Technology Ethics Framework",
      type: "Guidelines",
      description: "Best practices for AI and technology use in ADR proceedings",
      downloadSize: "1.5 MB",
      lastUpdated: "December 2024"
    }
  ];

  return (
    <StudentLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#610000] via-[#7d0000] to-[#8b0000] text-white py-16 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-sf-pro-display" data-testid="title">Professional Resources</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto font-sf-pro-text">
              Access comprehensive materials, guidelines, and tools to support your ADR practice and professional development.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-16">
          {/* Downloadable Course Resources */}
          <DownloadableResources />
          
          <InstructorResourceUpload />

          {/* Featured Resources */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-[#2c2015] text-center font-sf-pro-display">Featured Resources</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {featuredResources.map((resource) => (
                <Card key={resource.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="space-y-2">
                      <Badge variant="secondary" className="w-fit text-xs">
                        {resource.type}
                      </Badge>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">{resource.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span><i className="fas fa-file-pdf mr-1"></i>{resource.downloadSize}</span>
                      <span><i className="fas fa-calendar mr-1"></i>{resource.lastUpdated}</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      data-testid={`download-${resource.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <i className="fas fa-download mr-2"></i>
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Resource Categories */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-[#2c2015] text-center font-sf-pro-display">Resource Categories</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resourceCategories.map((category) => (
                <Card key={category.title} className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className={`${category.icon} text-primary`}></i>
                      </div>
                      <span>{category.title}</span>
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">{category.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {category.resources.map((resource) => (
                        <li key={resource} className="flex items-start space-x-2">
                          <i className="fas fa-chevron-right text-primary text-xs mt-1"></i>
                          <span className="text-sm text-muted-foreground">{resource}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-auto"
                      data-testid={`explore-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      Explore Resources
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Quick Access Tools */}
          <section className="bg-[#faf9f6] rounded-xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-[#2c2015] font-sf-pro-display">Quick Access Tools</h2>
              <p className="text-lg text-muted-foreground">
                Essential tools and calculators for ADR professionals
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <i className="fas fa-calculator text-primary text-2xl mb-3"></i>
                  <h4 className="font-medium mb-2">Fee Calculator</h4>
                  <p className="text-xs text-muted-foreground">Calculate arbitration fees and costs</p>
                </CardContent>
              </Card>
              
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <i className="fas fa-calendar-check text-primary text-2xl mb-3"></i>
                  <h4 className="font-medium mb-2">Timeline Planner</h4>
                  <p className="text-xs text-muted-foreground">Plan ADR process timelines</p>
                </CardContent>
              </Card>
              
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <i className="fas fa-users text-primary text-2xl mb-3"></i>
                  <h4 className="font-medium mb-2">Panel Builder</h4>
                  <p className="text-xs text-muted-foreground">Select arbitrator panels</p>
                </CardContent>
              </Card>
              
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <i className="fas fa-file-contract text-primary text-2xl mb-3"></i>
                  <h4 className="font-medium mb-2">Template Library</h4>
                  <p className="text-xs text-muted-foreground">Access standard forms and templates</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Member Access Notice */}
          <section className="text-center space-y-6">
            <Card className="max-w-2xl mx-auto border-[#d4c5b0]/30">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <i className="fas fa-info-circle text-[#610000] text-3xl"></i>
                  <h3 className="text-xl font-bold text-[#2c2015] font-sf-pro-display">Member Access Required</h3>
                  <p className="text-[#6b5d4f] font-sf-pro-text">
                    Some resources are exclusively available to CIMA certified members and enrolled students. 
                    Please log in to access your personalized resource library.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button className="bg-[#610000] hover:bg-[#7d0000]" data-testid="button-login-access">
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Member Login
                    </Button>
                    <Button variant="outline" className="border-[#d4c5b0] text-[#610000] hover:bg-[#faf9f6]" data-testid="button-become-member">
                      Become a Member
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </StudentLayout>
  );
}