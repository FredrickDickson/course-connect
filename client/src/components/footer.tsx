import { Link } from "wouter";
import { Download } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="space-y-4" data-testid="footer-company">
            <div className="flex items-center space-x-3">
              <img 
                src="/uploads/logo.png" 
                alt="CIMA Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h3 className="text-lg font-bold text-[#5A2633]">CIMA Learn</h3>
                <p className="text-xs text-[#5A2633] -mt-1">Professional ADR Education</p>
              </div>
            </div>
            <p className="text-sm text-black">
              Center for International Mediators and Arbitrators - Leading global alternative dispute resolution education and certification.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-black hover:text-gray-600 transition-colors"
                data-testid="social-linkedin"
              >
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a 
                href="#" 
                className="text-black hover:text-gray-600 transition-colors"
                data-testid="social-twitter"
              >
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a 
                href="#" 
                className="text-black hover:text-gray-600 transition-colors"
                data-testid="social-facebook"
              >
                <i className="fab fa-facebook text-xl"></i>
              </a>
            </div>
          </div>

          {/* Learning Links */}
          <div data-testid="footer-learning">
            <h4 className="text-sm font-semibold text-black mb-4 uppercase tracking-wider">Learning</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://thecima.org/cima-qualification-pathways/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-black hover:text-gray-600 transition-colors"
                  data-testid="footer-qualification-pathway"
                >
                  Qualification Pathway
                </a>
              </li>
              <li>
                <Link href="/fcrimarb-fellowship">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    FCIMArb Fellowship
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/certification">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Certification
                  </span>
                </Link>
              </li>
              {/* <li>
                <Link href="/resources">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Resources
                  </span>
                </Link>
              </li> */}
              <li>
                <Link href="/become-instructor">
                  <span className="text-sm text-black font-medium hover:text-gray-600 transition-colors">
                    Join our Global Faculty
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div data-testid="footer-support">
            <h4 className="text-sm font-semibold text-black mb-4 uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/help-center">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Help Center
                  </span>
                </Link>
              </li>
              {/* <li>
                <Link href="/community-forum">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Community Forum
                  </span>
                </Link>
              </li> */}
              <li>
                <Link href="/technical-support">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Technical Support
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/academic-advising">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Academic Advising
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="text-sm text-black hover:text-gray-600 transition-colors">
                    Contact Us
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Accreditation */}
          <div data-testid="footer-accreditation">
            <h4 className="text-sm font-semibold text-black mb-4 uppercase tracking-wider">Accreditation</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/uploads/UK-Standards-V2.0-0423_2023-04-24-143733.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 text-sm text-black hover:text-[#5A2633] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="truncate">UK Standards V2.0 (Apr 2023)</span>
                </a>
              </li>
              <li>
                <a
                  href="/uploads/ASIC-UK-Handbook-V2.2.1-0426.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 text-sm text-black hover:text-[#5A2633] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="truncate">ASIC UK Handbook V2.2.1</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div data-testid="footer-contact">
            <h4 className="text-sm font-semibold text-black mb-4 uppercase tracking-wider">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <i className="fas fa-map-marker-alt text-black text-sm mt-1"></i>
                <div className="text-sm text-black">
                  Oxford Science Park<br />
                  John Eccles House<br />
                  Oxford, Oxfordshire, UK
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-envelope text-black text-sm"></i>
                <a 
                  href="mailto:info@thecima.org" 
                  className="text-sm text-black hover:text-gray-600 transition-colors"
                  data-testid="contact-email"
                >
                  info@thecima.org
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-globe text-black text-sm"></i>
                <a 
                  href="https://thecima.org" 
                  className="text-sm text-black hover:text-gray-600 transition-colors"
                  data-testid="contact-website"
                >
                  thecima.org
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-black" data-testid="copyright">
            © {new Date().getFullYear()} Center for International Mediators and Arbitrators. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy-policy">
              <span className="text-sm text-black hover:text-gray-600 transition-colors">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms-of-service">
              <span className="text-sm text-black hover:text-gray-600 transition-colors">
                Terms of Service
              </span>
            </Link>
            <Link href="/cookie-policy">
              <span className="text-sm text-black hover:text-gray-600 transition-colors">
                Cookie Policy
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
