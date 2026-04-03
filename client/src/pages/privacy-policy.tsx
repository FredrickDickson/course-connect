import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicy() {
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
              {t("legal.privacyPolicy")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("legal.lastUpdated")}: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.infoWeCollect")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Center for International Mediators and Arbitrators (CIMA) is
                committed to protecting your privacy. This policy describes how
                we collect, use, and protect your personal information when you
                use our learning management system and educational services.
              </p>

              <h3 className="text-xl font-semibold text-foreground">
                {t("legal.personalInfo")}
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Name, email address, and contact information</li>
                <li>Educational background and professional qualifications</li>
                <li>Course enrollment and progress data</li>
                <li>Payment and billing information</li>
                <li>Communications with our support team</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.howWeUseInfo")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use your information to provide educational services, process
                payments, communicate with you about your courses, and improve
                our platform. We do not sell your personal information to third
                parties.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.dataProtection")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate security measures to protect your
                personal information against unauthorized access, alteration,
                disclosure, or destruction. Your data is stored securely and
                accessed only by authorized personnel.
              </p>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.yourRights")}
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Withdraw consent for data processing</li>
                <li>Data portability</li>
              </ul>

              <h2 className="text-2xl font-semibold text-foreground">
                {t("legal.contactUs")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this privacy policy or your personal
                data, please contact us at:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-foreground font-medium">
                  {t("legal.privacyOfficer")}
                </p>
                <p className="text-muted-foreground">info@thecima.org</p>
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
