import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import cimaLogo from "@/assets/cima-logo.png";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t, isRTL } = useLanguage();
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-3">
              <img
                src={cimaLogo}
                alt="CIMA Logo"
                className="h-16 w-auto"
                data-testid="logo-404"
              />
              <div>
                <h2 className="text-2xl font-bold text-primary">CIMA Learn</h2>
                <p className="text-sm text-muted-foreground">
                  {t("landing.heroHighlight")}
                </p>
              </div>
            </div>
          </div>

          {/* 404 Error */}
          <div className="space-y-4">
            <h1
              className="text-9xl font-bold text-primary/20"
              data-testid="error-code"
            >
              404
            </h1>
            <h2 className="text-3xl font-bold text-foreground">
              {t("notFound.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {t("notFound.description")}
            </p>
          </div>

          {/* Navigation Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <Link href="/">
              <Button className="w-full" data-testid="button-home">
                <i className="fas fa-home mr-2"></i>
                {t("notFound.goHome")}
              </Button>
            </Link>
            <Link href="/courses">
              <Button
                variant="outline"
                className="w-full"
                data-testid="button-courses"
              >
                <i className="fas fa-book mr-2"></i>
                {t("notFound.browseCourses")}
              </Button>
            </Link>
          </div>

          {/* Help Links */}
          <div className="space-y-4 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t("notFound.stillNeedHelp")}
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/help-center">
                <span
                  className="text-sm text-primary hover:underline"
                  data-testid="link-help"
                >
                  {t("notFound.helpCenter")}
                </span>
              </Link>
              <Link href="/contact">
                <span
                  className="text-sm text-primary hover:underline"
                  data-testid="link-contact"
                >
                  {t("notFound.contactSupport")}
                </span>
              </Link>
              <Link href="/community">
                <span
                  className="text-sm text-primary hover:underline"
                  data-testid="link-community"
                >
                  {t("notFound.communityForum")}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
