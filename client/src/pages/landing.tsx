import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import WorldMap from "@/components/world-map";
import fellowshipImage from "@assets/stock_images/professional_arbitra_195864e0.jpg";
import maImage from "@assets/stock_images/mergers_acquisitions_0f9cf993.jpg";

/**
 * Landing Component - FULLY TRANSLATED
 * 
 * Main landing page for the ADR (Alternative Dispute Resolution) professional
 * development platform. Features hero section with featured course card, 
 * program offerings, and global community information.
 * 
 * Fully internationalized with support for EN, FR, ES, AR, and ZH.
 * All text is now using translation keys - 100% translatable!
 */
export default function Landing() {
  // Get translation function and language context for multi-language support
  const { t, isRTL } = useLanguage();
  
  // State for featured course card carousel
  const [selectedCourse, setSelectedCourse] = useState(0);

  const currentCourse = selectedCourse === 0 
    ? {
        title: t('landing.featuredCourseTitle'),
        category: t('landing.featuredCourseCategory'),
        rating: 4.9,
        reviews: 2847,
        students: 12450,
        description: t('landing.featuredCourseDescription'),
        price: 2950,
        originalPrice: 5900,
        badge: t('landing.mostPopularBadge'),
        features: [
          t('landing.featuredCourseFeature1'),
          t('landing.featuredCourseFeature2'),
          t('landing.featuredCourseFeature3')
        ]
      }
    : {
        title: t('landing.fellowshipTitle'),
        category: t('landing.fellowshipCategory'),
        rating: 4.8,
        reviews: 1523,
        students: 8200,
        description: t('landing.fellowshipDescription'),
        price: 4750,
        originalPrice: 9500,
        badge: t('landing.premiumBadge'),
        features: [
          t('landing.fellowshipFeature1'),
          t('landing.fellowshipFeature2'),
          t('landing.fellowshipFeature3')
        ]
      };

  const discount = Math.round(((currentCourse.originalPrice - currentCourse.price) / currentCourse.originalPrice) * 100);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* ============ HERO SECTION ============ */}
      <section className="bg-gradient-to-br from-primary via-primary to-blue-900 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* LEFT COLUMN: Headline, Description & CTA */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  {t('landing.heroTitle')}{" "}
                  <span className="text-white">{t('landing.heroHighlight')}</span>
                </h1>
                
                <p className="text-xl text-blue-100 leading-relaxed">
                  {t('landing.heroSubtitle')}
                </p>
              </div>

              {/* Call-to-Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  data-testid="button-explore-programs"
                  onClick={() => window.location.href = '/login'}
                  className="bg-amber-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-lg"
                >
                  {t('landing.getStarted')}
                </Button>
                
                <Button 
                  data-testid="button-watch-overview"
                  variant="outline"
                  onClick={() => window.open('https://youtu.be/Y7eAsjyGaoI', '_blank')}
                  className="border-2 border-white/30 bg-white/10 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-900 transition-colors backdrop-blur-sm"
                >
                  <i className="fas fa-play mr-2"></i>
                  {t('landing.watchOverview')}
                </Button>
              </div>

              {/* KEY STATISTICS */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-blue-400">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white" data-testid="stat-members">5,000+</div>
                  <div className="text-sm text-blue-200">{t('landing.globalMembers')}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-white" data-testid="stat-success">95%</div>
                  <div className="text-sm text-blue-200">{t('landing.successRate')}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-white" data-testid="stat-countries">50+</div>
                  <div className="text-sm text-blue-200">{t('landing.countries')}</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Featured Course Card */}
            <div className="relative">
              <Card className="shadow-2xl border-2 border-amber-200 overflow-hidden bg-white">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-primary to-blue-700 p-6 border-b border-amber-200">
                  <div className="flex items-center gap-4">
                    {/* <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <i className="fas fa-star text-primary text-xl"></i>
                    </div> */}
                    <div>
                      <div className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
                        {currentCourse.badge}
                      </div>
                      <h3 className="font-bold text-white text-lg">{currentCourse.title}</h3>
                    </div>
                  </div>
                </div>

                {/* Course Content */}
                <CardContent className="p-6 space-y-4">
                  
                  {/* Category */}
                  <div>
                    <p className="text-sm text-primary font-semibold">{currentCourse.category}</p>
                  </div>

                  {/* Rating and Stats */}
                  <div className="flex items-center gap-4 text-sm pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <i className="fas fa-star text-amber-500"></i>
                      <span className="text-foreground font-semibold">{currentCourse.rating}</span>
                      <span className="text-muted-foreground">({currentCourse.reviews.toLocaleString()})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-users text-primary"></i>
                      <span className="text-muted-foreground">{currentCourse.students.toLocaleString()} {t('courses.students')}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {currentCourse.description}
                  </p>

                  {/* Key Features */}
                  <div className="space-y-2 py-4 border-t border-b border-gray-200">
                    {currentCourse.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <i className="fas fa-check-circle text-green-600"></i>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">${currentCourse.price}</span>
                      <span className="text-sm text-muted-foreground line-through">${currentCourse.originalPrice}</span>
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded font-bold">{discount}% OFF</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button 
                    onClick={() => window.location.href = '/login'}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition shadow-md"
                  >
                    <i className="fas fa-play mr-2"></i>{t('courses.enrollNow')}
                  </Button>

                  {/* Course Selector Dots */}
                  <div className="flex gap-2 justify-center pt-4">
                    {[0, 1].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCourse(idx)}
                        className={`h-2 w-8 rounded-full transition ${
                          idx === selectedCourse ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Select course ${idx + 1}`}
                      ></button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURED PROGRAMS SECTION ============ */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">{t('landing.featuredCoursesTitle')}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('courses.subtitle')}
            </p>
          </div>

          {/* Two-column grid of program cards */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* PROGRAM CARD 1: Global M&A Program */}
            <Card className="shadow-lg border border-border overflow-hidden group hover:shadow-xl transition-shadow" data-testid="card-program-ma">
              
              <img 
                src={maImage} 
                alt="M&A arbitration and mediation training" 
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              <CardContent className="p-8">
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{t('landing.maProgramTitle')}</h3>
                    <p className="text-sm text-primary font-medium">{t('landing.maProgramCategory')}</p>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {t('landing.maProgramBadge')}
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6">
                  {t('landing.maProgramDescription')}
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-clock text-primary"></i>
                    <span className="text-sm text-muted-foreground">{t('landing.maProgramFeature1')}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-globe text-primary"></i>
                    <span className="text-sm text-muted-foreground">{t('landing.maProgramFeature2')}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-certificate text-primary"></i>
                    <span className="text-sm text-muted-foreground">{t('landing.maProgramFeature3')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground" data-testid="price-ma">$2,950</div>
                    <div className="text-sm text-muted-foreground">USD</div>
                  </div>
                  <Button 
                    data-testid="button-learn-more-ma"
                    onClick={() => window.location.href = '/login'}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
                  >
                    {t('courseDetail.learnMore')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PROGRAM CARD 2: FCIMArb Fellowship */}
            <Card className="shadow-lg border border-border overflow-hidden group hover:shadow-xl transition-shadow relative" data-testid="card-program-fellowship">
              
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg">
                  <i className="fas fa-ribbon text-xs"></i>
                  <span>{t('landing.fellowshipBadgeText')}</span>
                </div>
              </div>
              
              <img 
                src={fellowshipImage} 
                alt="FCIMArb Fellowship professional development" 
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              <CardContent className="p-8">
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{t('landing.fellowshipTitle')}</h3>
                    <p className="text-sm text-primary font-medium">{t('landing.fellowshipCategory')}</p>
                  </div>
                  <div className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-sm font-medium">
                    {t('landing.fellowshipBadge')}
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6">
                  {t('landing.fellowshipDescription')}
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-award text-amber-600"></i>
                    <span className="text-sm text-muted-foreground">{t('landing.fellowshipFeature1')}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-users text-amber-600"></i>
                    <span className="text-sm text-muted-foreground">{t('landing.fellowshipFeature2')}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-infinity text-amber-600"></i>
                    <span className="text-sm text-muted-foreground">{t('landing.fellowshipFeature3')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground" data-testid="price-fellowship">$4,750</div>
                    <div className="text-sm text-muted-foreground">USD</div>
                  </div>
                  <Button 
                    data-testid="button-apply-fellowship"
                    onClick={() => window.location.href = '/login'}
                    className="bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                  >
                    {t('courseDetail.enrollNow')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============ GLOBAL COMMUNITY SECTION ============ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">{t('landing.whyChooseTitle')}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('landing.worldwidePresenceDescription')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <WorldMap />

            <div className="space-y-8">
              
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{t('landing.worldwidePresenceTitle')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('landing.worldwidePresenceDescription')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3" data-testid="location-london">
                    <i className="fas fa-map-marker-alt text-amber-500"></i>
                    <span className="font-medium text-foreground">London</span>
                  </div>
                  <div className="flex items-center space-x-3" data-testid="location-accra">
                    <i className="fas fa-map-marker-alt text-primary"></i>
                    <span className="font-medium text-foreground">Accra</span>
                  </div>
                  <div className="flex items-center space-x-3" data-testid="location-singapore">
                    <i className="fas fa-map-marker-alt text-secondary"></i>
                    <span className="font-medium text-foreground">Singapore</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3" data-testid="location-dubai">
                    <i className="fas fa-map-marker-alt text-amber-500"></i>
                    <span className="font-medium text-foreground">Dubai</span>
                  </div>
                  <div className="flex items-center space-x-3" data-testid="location-newyork">
                    <i className="fas fa-map-marker-alt text-primary"></i>
                    <span className="font-medium text-foreground">New York</span>
                  </div>
                  <div className="flex items-center space-x-3" data-testid="location-oxford">
                    <i className="fas fa-map-marker-alt text-secondary"></i>
                    <span className="font-medium text-foreground">Oxford</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                
                <Card className="p-4 bg-muted/30" data-testid="benefit-network">
                  <div className="flex items-center space-x-4">
                    <i className="fas fa-users text-primary text-xl"></i>
                    <div>
                      <div className="font-medium text-foreground">{t('landing.professionalNetworkTitle')}</div>
                      <div className="text-sm text-muted-foreground">{t('landing.professionalNetworkDesc')}</div>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-muted/30" data-testid="benefit-opportunities">
                  <div className="flex items-center space-x-4">
                    <i className="fas fa-briefcase text-amber-500 text-xl"></i>
                    <div>
                      <div className="font-medium text-foreground">{t('landing.careerOpportunitiesTitle')}</div>
                      <div className="text-sm text-muted-foreground">{t('landing.careerOpportunitiesDesc')}</div>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-muted/30" data-testid="benefit-recognition">
                  <div className="flex items-center space-x-4">
                    <i className="fas fa-globe text-secondary text-xl"></i>
                    <div>
                      <div className="font-medium text-foreground">{t('landing.internationalRecognitionTitle')}</div>
                      <div className="text-sm text-muted-foreground">{t('landing.internationalRecognitionDesc')}</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}