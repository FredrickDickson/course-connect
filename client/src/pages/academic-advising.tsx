import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import StudentLayout from "@/components/student-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AcademicAdvising() {
  return (
    <StudentLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#610000] via-[#7d0000] to-[#8b0000] text-white py-16 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-sf-pro-display" data-testid="title">Academic Advising</h1>
            <p className="text-lg text-white/80 font-sf-pro-text">
              Get personalized guidance for your ADR education and career development.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-[#d4c5b0]/30 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="font-sf-pro-display">Course Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#6b5d4f] font-sf-pro-text">
                  Our academic advisors help you choose the right courses and certification 
                  programs based on your career goals and experience level.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Career Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get guidance on career pathways in international arbitration and mediation, 
                  including networking opportunities and professional development.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader>
              <CardTitle className="font-sf-pro-display">Schedule a Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#6b5d4f] font-sf-pro-text mb-4">
                Book a one-on-one session with our academic advisors to discuss your educational goals.
              </p>
              <Link href="/contact">
                <Button className="bg-[#610000] hover:bg-[#7d0000]" data-testid="button-schedule-consultation">
                  <i className="fas fa-calendar mr-2"></i>
                  Schedule Consultation
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </StudentLayout>
  );
}