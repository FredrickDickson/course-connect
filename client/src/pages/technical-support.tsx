import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import StudentLayout from "@/components/student-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TechnicalSupport() {
  return (
    <StudentLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#610000] via-[#7d0000] to-[#8b0000] text-white py-16 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-sf-pro-display" data-testid="title">Technical Support</h1>
            <p className="text-lg text-white/80 font-sf-pro-text">
              Get technical assistance for platform issues and troubleshooting.
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
                <CardTitle className="font-sf-pro-display">Common Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[#6b5d4f] font-sf-pro-text">
                  <li>• Login and password problems</li>
                  <li>• Video playback issues</li>
                  <li>• Course access difficulties</li>
                  <li>• Payment processing errors</li>
                  <li>• Mobile app troubleshooting</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-[#d4c5b0]/30 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="font-sf-pro-display">System Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[#6b5d4f] font-sf-pro-text">
                  <li>• Modern web browser (Chrome, Firefox, Safari)</li>
                  <li>• Stable internet connection</li>
                  <li>• JavaScript enabled</li>
                  <li>• Cookies enabled</li>
                  <li>• Updated browser version</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader>
              <CardTitle className="font-sf-pro-display">Submit a Technical Issue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#6b5d4f] font-sf-pro-text mb-4">
                For technical support, please contact us with detailed information about your issue.
              </p>
              <Link href="/contact">
                <Button className="bg-[#610000] hover:bg-[#7d0000]" data-testid="button-contact-tech">
                  <i className="fas fa-tools mr-2"></i>
                  Contact Technical Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </StudentLayout>
  );
}