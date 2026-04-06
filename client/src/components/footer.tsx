import { Link } from "wouter";
import cimaLogo from "@/assets/cima-logo.png";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4" data-testid="footer-company">
            <div className="flex items-center space-x-3">
              <img 
                src={cimaLogo} 
                alt="CIMA Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h3 className="text-lg font-bold text-primary">CIMA Learn</h3>
                <p className="text-xs text-muted-foreground -mt-1">Professional ADR Education</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Center for International Mediators and Arbitrators - Leading global alternative dispute resolution education and certification.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="social-linkedin"
              >
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="social-twitter"
              >
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="social-facebook"
              >
                <i className="fab fa-facebook text-xl"></i>
              </a>
            </div>
          </div>

          {/* Learning Links */}
          <div data-testid="footer-learning">
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Learning</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/qualification-pathway">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Qualification Pathway
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/fcrimarb-fellowship">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    FCIMArb Fellowship
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/certification">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Certification
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/resources">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Resources
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/become-instructor">
                  <span className="text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                    Become an Instructor
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div data-testid="footer-support">
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/help-center">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Help Center
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/community-forum">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Community Forum
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/technical-support">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Technical Support
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/academic-advising">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Academic Advising
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Contact Us
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div data-testid="footer-contact">
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <i className="fas fa-map-marker-alt text-muted-foreground text-sm mt-1"></i>
                <div className="text-sm text-muted-foreground">
                  Oxford Science Park<br />
                  John Eccles House<br />
                  Oxford, Oxfordshire, UK
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-envelope text-muted-foreground text-sm"></i>
                <a 
                  href="mailto:info@thecima.org" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  data-testid="contact-email"
                >
                  info@thecima.org
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-globe text-muted-foreground text-sm"></i>
                <a 
                  href="https://thecima.org" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  data-testid="contact-website"
                >
                  thecima.org
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground" data-testid="copyright">
            © {new Date().getFullYear()} Center for International Mediators and Arbitrators. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy-policy">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms-of-service">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </span>
            </Link>
            <Link href="/cookie-policy">
              <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Cookie Policy
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
