import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";

export default function Programs() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-blue-900 text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="programs-title">
            Professional ADR Programs
          </h1>
          <p className="text-xl text-blue-100 max-w-4xl mx-auto mb-8">
            Advance your career with internationally recognized qualifications designed for aspiring and experienced ADR professionals. Join our global community of mediators and arbitrators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              data-testid="button-compare-programs"
              className="bg-accent text-accent-foreground px-8 py-4 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
            >
              Compare Programs
            </Button>
            <Button 
              data-testid="button-speak-advisor"
              variant="outline"
              className="border border-blue-300 text-blue-100 px-8 py-4 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              Speak to an Advisor
            </Button>
          </div>
        </div>
      </section>

      {/* Program Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="flagship" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3" data-testid="program-tabs">
              <TabsTrigger value="flagship">Flagship Programs</TabsTrigger>
              <TabsTrigger value="specialized">Specialized Courses</TabsTrigger>
              <TabsTrigger value="certification">Certification Paths</TabsTrigger>
            </TabsList>

            {/* Flagship Programs */}
            <TabsContent value="flagship" className="space-y-8" data-testid="tab-flagship">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Flagship Programs</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Our premier qualifications that provide comprehensive training and internationally recognized credentials.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Global M&A Program */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid="program-ma">
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                    alt="Global M&A Program" 
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">Global M&A Program</h3>
                        <p className="text-lg text-accent font-medium mb-4">International Arbitration & Mediation</p>
                        <p className="text-muted-foreground">
                          An expedited route for career development in international M&A dispute resolution. Master complex cross-border transactions, regulatory frameworks, and dispute resolution mechanisms used in global mergers and acquisitions.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-clock text-primary"></i>
                            <span className="text-sm text-muted-foreground">12 weeks intensive</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-globe text-primary"></i>
                            <span className="text-sm text-muted-foreground">International faculty</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-users text-primary"></i>
                            <span className="text-sm text-muted-foreground">Live case studies</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-certificate text-primary"></i>
                            <span className="text-sm text-muted-foreground">Professional certification</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-network-wired text-primary"></i>
                            <span className="text-sm text-muted-foreground">Alumni network</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-briefcase text-primary"></i>
                            <span className="text-sm text-muted-foreground">Career placement</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-2">Program Highlights</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Cross-border transaction structuring</li>
                          <li>• Regulatory compliance frameworks</li>
                          <li>• Due diligence and risk assessment</li>
                          <li>• Dispute prevention strategies</li>
                          <li>• International arbitration procedures</li>
                        </ul>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <div className="text-3xl font-bold text-foreground" data-testid="ma-price">$2,950</div>
                          <div className="text-sm text-muted-foreground">USD • Payment plans available</div>
                        </div>
                        <Link href="/courses">
                          <Button 
                            data-testid="button-enroll-ma"
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
                          >
                            Learn More
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FCIMArb Fellowship */}
                <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid="program-fellowship">
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-accent text-accent-foreground">Premium</Badge>
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                    alt="FCIMArb Fellowship" 
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">FCIMArb Fellowship</h3>
                        <p className="text-lg text-accent font-medium mb-4">Fellow of the Center for International Mediators and Arbitrators</p>
                        <p className="text-muted-foreground">
                          Our most prestigious qualification. Internationally recognized and respected designation upon program completion. Join an elite community of certified arbitrators and mediators with global practice opportunities.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-award text-accent"></i>
                            <span className="text-sm text-muted-foreground">Fellow designation</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-users text-accent"></i>
                            <span className="text-sm text-muted-foreground">Global network access</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-gavel text-accent"></i>
                            <span className="text-sm text-muted-foreground">Tribunal appointments</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-infinity text-accent"></i>
                            <span className="text-sm text-muted-foreground">Lifetime membership</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-handshake text-accent"></i>
                            <span className="text-sm text-muted-foreground">Referral network</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-graduation-cap text-accent"></i>
                            <span className="text-sm text-muted-foreground">Continuing education</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                        <h4 className="font-semibold text-foreground mb-2">Fellowship Benefits</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Use of FCIMArb post-nominal letters</li>
                          <li>• Priority placement on arbitrator panels</li>
                          <li>• Exclusive networking events</li>
                          <li>• Fellow-level practice opportunities</li>
                          <li>• Mentorship programs</li>
                        </ul>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <div className="text-3xl font-bold text-foreground" data-testid="fellowship-price">$4,750</div>
                          <div className="text-sm text-muted-foreground">USD • Includes all materials</div>
                        </div>
                        <Link href="/courses">
                          <Button 
                            data-testid="button-apply-fellowship"
                            className="bg-accent text-accent-foreground px-6 py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
                          >
                            Apply Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Specialized Courses */}
            <TabsContent value="specialized" className="space-y-8" data-testid="tab-specialized">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Specialized Courses</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Focus on specific areas of ADR practice with our targeted training programs.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mediation Fundamentals */}
                <Card className="hover:shadow-lg transition-shadow" data-testid="course-mediation">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-secondary/10 text-secondary">Part I (Associate)</Badge>
                      <div className="flex items-center space-x-1 text-sm">
                        <i className="fas fa-star text-accent"></i>
                        <span className="text-muted-foreground">4.8 (156)</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Fundamentals of Mediation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Master the core principles and techniques of effective mediation practice.
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span><i className="fas fa-clock mr-1"></i>8 hours</span>
                        <span><i className="fas fa-video mr-1"></i>12 lessons</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-foreground">$450</div>
                      <Button size="sm">Enroll Now</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* International Arbitration */}
                <Card className="hover:shadow-lg transition-shadow" data-testid="course-arbitration">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-accent/10 text-accent">Part III (Fellow)</Badge>
                      <div className="flex items-center space-x-1 text-sm">
                        <i className="fas fa-star text-accent"></i>
                        <span className="text-muted-foreground">4.9 (89)</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">International Arbitration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Fellow-level strategies for complex cross-border commercial disputes.
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span><i className="fas fa-clock mr-1"></i>16 hours</span>
                        <span><i className="fas fa-video mr-1"></i>24 lessons</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-foreground">$850</div>
                      <Button size="sm">Enroll Now</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ADR Ethics */}
                <Card className="hover:shadow-lg transition-shadow" data-testid="course-ethics">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-green-100 text-green-700">Part II (Member)</Badge>
                      <div className="flex items-center space-x-1 text-sm">
                        <i className="fas fa-star text-accent"></i>
                        <span className="text-muted-foreground">4.7 (124)</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">ADR Ethics & Standards</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Professional conduct and ethical considerations in dispute resolution.
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span><i className="fas fa-clock mr-1"></i>6 hours</span>
                        <span><i className="fas fa-video mr-1"></i>10 lessons</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-foreground">$350</div>
                      <Button size="sm">Enroll Now</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Link href="/courses">
                  <Button variant="outline" size="lg" data-testid="view-all-courses">
                    View All Courses
                    <i className="fas fa-arrow-right ml-2"></i>
                  </Button>
                </Link>
              </div>
            </TabsContent>

            {/* Certification Paths */}
            <TabsContent value="certification" className="space-y-8" data-testid="tab-certification">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Certification Paths</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Choose your path to professional certification based on your career goals and experience level.
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Foundation Path */}
                <Card className="border-2 border-secondary/20 hover:border-secondary transition-colors" data-testid="path-foundation">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-play text-secondary text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">Foundation Path</h3>
                    <p className="text-muted-foreground mb-6">Perfect for newcomers to ADR practice</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="text-sm text-left space-y-2">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Fundamentals of Mediation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Introduction to Arbitration</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>ADR Ethics & Standards</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-foreground mb-2">$1,200</div>
                    <div className="text-sm text-muted-foreground mb-6">Complete package</div>
                    <Button className="w-full">Start Foundation</Button>
                  </CardContent>
                </Card>

                {/* Professional Path */}
                <Card className="border-2 border-primary/50 hover:border-primary transition-colors relative" data-testid="path-professional">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                  </div>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-star text-primary text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">Professional Path</h3>
                    <p className="text-muted-foreground mb-6">For practicing professionals seeking advancement</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="text-sm text-left space-y-2">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Global M&A Program</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>International Arbitration</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Fellow-level Case Management</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Professional Certification</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-foreground mb-2">$3,500</div>
                    <div className="text-sm text-muted-foreground mb-6">Save $450 vs individual</div>
                    <Button className="w-full bg-primary">Start Professional</Button>
                  </CardContent>
                </Card>

                {/* Fellowship Path */}
                <Card className="border-2 border-accent/20 hover:border-accent transition-colors" data-testid="path-fellowship">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-crown text-accent text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">Fellowship Path</h3>
                    <p className="text-muted-foreground mb-6">Elite certification for senior practitioners</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="text-sm text-left space-y-2">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>FCIMArb Fellowship</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Fellow-level Practice Methods</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Global Network Access</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Lifetime Membership</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-foreground mb-2">$4,750</div>
                    <div className="text-sm text-muted-foreground mb-6">Premium qualification</div>
                    <Button className="w-full bg-accent text-accent-foreground">Apply for Fellowship</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-accent to-yellow-600 text-accent-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your ADR Journey?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of professionals who have elevated their careers with CIMA's internationally recognized programs.
          </p>
          <div className="space-x-4">
            <Button 
              data-testid="button-get-started"
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-blue-800"
            >
              Get Started Today
            </Button>
            <Button 
              data-testid="button-schedule-consultation"
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-accent"
            >
              Schedule Consultation
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
