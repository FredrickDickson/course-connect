import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TermsOfService() {
  const { t, isRTL } = useLanguage();
  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                {t("legal.backToHome")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1
              className="text-4xl font-bold text-foreground"
              data-testid="title"
            >
              {t("legal.termsOfService")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("legal.lastUpdated")}: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.acceptanceOfTerms")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using the CIMA Learn platform, you accept and
                agree to be bound by the terms and provision of this agreement.
                These terms govern your use of our educational services,
                courses, and certification programs.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.educationalServices")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                CIMA Learn provides professional education in Alternative
                Dispute Resolution (ADR), including courses in international
                arbitration and mediation. Our services include online courses,
                certification programs, and professional development resources.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.userResponsibilities")}
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>
                  Use the platform for legitimate educational purposes only
                </li>
                <li>
                  Respect intellectual property rights of course materials
                </li>
                <li>Follow our community guidelines and code of conduct</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.paymentAndRefunds")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Course fees must be paid in full before accessing course
                materials. Refund policies vary by program and are outlined in
                the specific course terms. Professional certification programs
                may have different refund terms due to their intensive nature.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.intellectualProperty")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All course materials, content, and resources are the
                intellectual property of CIMA or our licensed partners. Students
                may access materials for personal educational use but may not
                redistribute, share, or use materials for commercial purposes.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.certificationAndCredentials")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Professional certifications and credentials are awarded upon
                successful completion of program requirements. CIMA reserves the
                right to verify student identity and work before issuing
                certifications. Fraudulent completion may result in credential
                revocation.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.limitationOfLiability")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                CIMA provides educational services "as is" and makes no
                warranties about the completeness, reliability, or accuracy of
                information. Our liability is limited to the fees paid for the
                specific service in question.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.contactInformation")}
              </h2>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-foreground font-medium">
                  {t("legal.legalDepartment")}
                </p>
                 <p className="text-muted-foreground">info@thecima.org</p>
                {/* <p className="text-muted-foreground">legal@thecima.org</p> */}
                <p className="text-muted-foreground">
                  Oxford Science Park, John Eccles House
                  <br />
                  Oxford, Oxfordshire, UK
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
