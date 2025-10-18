import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { useState } from "react";

export default function Contact() {
  // const [formData, setFormData] = useState({
  //   name: '',
  //   email: '',
  //   subject: '',
  //   message: ''
  // });

  // // State management for form submission
  // const [isLoading, setIsLoading] = useState(false);
  // const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // const [errorMessage, setErrorMessage] = useState('');

  // /**
  //  * Handle form submission
  //  * Sends email via Resend API and provides user feedback
  //  */
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   setSubmitStatus('idle');
  //   setErrorMessage('');

  //   try {
  //     // Call backend API to send email via Resend
  //     const response = await fetch('/api/send-email', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         name: formData.name,
  //         email: formData.email,
  //         subject: formData.subject,
  //         message: formData.message,
  //       }),
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to send email');
  //     }

  //     const data = await response.json();
      
  //     // Success - clear form and show success message
  //     setFormData({
  //       name: '',
  //       email: '',
  //       subject: '',
  //       message: ''
  //     });
  //     setSubmitStatus('success');
  //     console.log('Email sent successfully:', data);

  //     // Clear success message after 5 seconds
  //     setTimeout(() => setSubmitStatus('idle'), 5000);
  //   } catch (error) {
  //     // Error - show error message
  //     setSubmitStatus('error');
  //     setErrorMessage(error instanceof Error ? error.message : 'An error occurred while sending your message');
  //     console.error('Error sending email:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground" data-testid="title">Contact Us</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get in touch with our team for support, inquiries, or more information about our programs.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* CONTACT FORM - COMMENTED OUT */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Success Message */}
                {/* {submitStatus === 'success' && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                    <i className="fas fa-check-circle text-green-600 text-xl"></i>
                    <div>
                      <h4 className="font-medium text-green-900">Message Sent Successfully!</h4>
                      <p className="text-sm text-green-700">We'll get back to you as soon as possible.</p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {/* {submitStatus === 'error' && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                    <i className="fas fa-exclamation-circle text-red-600 text-xl"></i>
                    <div>
                      <h4 className="font-medium text-red-900">Error Sending Message</h4>
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name and Email Fields */}
                  {/* <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Name *
                      </label>
                      <Input
                        type="text"
                        required
                        data-testid="input-name"
                        placeholder="Your Name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        required
                        data-testid="input-email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  {/* Subject Field */}
                  {/* <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Subject *
                    </label>
                    <Input
                      type="text"
                      required
                      data-testid="input-subject"
                      placeholder="What is this about?"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      disabled={isLoading}
                    />
                  </div>
                  
                  {/* Message Field */}
                  {/* <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Message *
                    </label>
                    <Textarea
                      rows={6}
                      required
                      data-testid="textarea-message"
                      placeholder="Your message here..."
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      disabled={isLoading}
                    />
                  </div>
                  
                  {/* Submit Button */}
                  {/* <Button 
                    type="submit" 
                    className="w-full" 
                    data-testid="button-send"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane mr-2"></i>
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card> */}

            {/* Contact Information */}
            <div className="space-y-8 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <i className="fas fa-map-marker-alt text-primary text-xl mt-1"></i>
                    <div>
                      <h4 className="font-medium text-foreground">Address</h4>
                      <p className="text-muted-foreground">
                        Oxford Science Park<br />
                        John Eccles House<br />
                        Oxford, Oxfordshire, UK
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <i className="fas fa-envelope text-primary text-xl mt-1"></i>
                    <div>
                      <h4 className="font-medium text-foreground">Email</h4>
                      <p className="text-muted-foreground">info@thecima.org</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <i className="fas fa-globe text-primary text-xl mt-1"></i>
                    <div>
                      <h4 className="font-medium text-foreground">Website</h4>
                      <p className="text-muted-foreground">www.thecima.org</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <i className="fas fa-clock text-primary text-xl mt-1"></i>
                    <div>
                      <h4 className="font-medium text-foreground">Office Hours</h4>
                      <p className="text-muted-foreground">
                        Monday - Friday: 9:00 AM - 5:00 PM GMT<br />
                        Weekend: Emergency support only
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Offices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground">Africa Region</h4>
                      <p className="text-muted-foreground">Accra, Ghana</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Asia Pacific</h4>
                      <p className="text-muted-foreground">Singapore</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Middle East</h4>
                      <p className="text-muted-foreground">Dubai, UAE</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Americas</h4>
                      <p className="text-muted-foreground">New York, USA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}