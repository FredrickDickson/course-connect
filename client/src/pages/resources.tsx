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
      <section className="bg-gradient-to-br from-[#5A2633] via-[#5A2633] to-[#5A2633] text-white py-16 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
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
        </div>
      </main>
    </StudentLayout>
  );
}