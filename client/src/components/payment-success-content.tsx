/**
 * Payment Success Content — Different views for ONLINE vs PHYSICAL courses
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PlayCircle, 
  Calendar, 
  MapPin, 
  Download,
  ExternalLink,
  CheckCircle,
  Video,
  Users,
  Clock
} from "lucide-react";
import { Link } from "wouter";

interface PaymentSuccessContentProps {
  courseType: "ONLINE" | "PHYSICAL";
  courseId?: string;
  courseName?: string;
  venueDetails?: {
    venue?: string;
    address?: string;
    city?: string;
    start_date?: string;
    end_date?: string;
  };
  transactionRef?: string;
  amount?: number;
  currency?: string;
}

export default function PaymentSuccessContent({
  courseType,
  courseId,
  courseName,
  venueDetails,
  transactionRef,
  amount,
  currency = "GHS"
}: PaymentSuccessContentProps) {
  if (courseType === "ONLINE") {
    return <OnlineCourseSuccess 
      courseId={courseId} 
      courseName={courseName}
      transactionRef={transactionRef}
      amount={amount}
      currency={currency}
    />;
  }

  return <PhysicalCourseSuccess 
    courseId={courseId}
    courseName={courseName}
    venueDetails={venueDetails}
    transactionRef={transactionRef}
    amount={amount}
    currency={currency}
  />;
}

// Online Course Success View
function OnlineCourseSuccess({
  courseId,
  courseName,
  transactionRef,
  amount,
  currency
}: {
  courseId?: string;
  courseName?: string;
  transactionRef?: string;
  amount?: number;
  currency?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <PlayCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">
          Your course is ready. Start learning right away.
        </p>
      </div>

      {/* What's Next */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            What's Next?
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">1</div>
              <p className="text-sm text-muted-foreground">Access your course materials immediately</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">2</div>
              <p className="text-sm text-muted-foreground">Watch video lessons at your own pace</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">3</div>
              <p className="text-sm text-muted-foreground">Complete assignments to earn your certificate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {courseId && (
          <Link href={`/learn/${courseId}`} className="flex-1">
            <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Learning Now
            </Button>
          </Link>
        )}
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" size="lg" className="w-full">
            Go to Dashboard
          </Button>
        </Link>
      </div>

      {/* Transaction Details */}
      {(transactionRef || amount) && (
        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
          {transactionRef && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction Ref</span>
              <span className="font-mono">{transactionRef}</span>
            </div>
          )}
          {amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">{currency} {amount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Physical Course Success View
function PhysicalCourseSuccess({
  courseId,
  courseName,
  venueDetails,
  transactionRef,
  amount,
  currency
}: {
  courseId?: string;
  courseName?: string;
  venueDetails?: {
    venue?: string;
    address?: string;
    city?: string;
    start_date?: string;
    end_date?: string;
  };
  transactionRef?: string;
  amount?: number;
  currency?: string;
}) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const startDate = formatDate(venueDetails?.start_date);
  const endDate = formatDate(venueDetails?.end_date);

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You're Registered!</h2>
        <p className="text-muted-foreground">
          See you at the event. Add it to your calendar.
        </p>
        {courseName && (
          <Badge variant="secondary" className="mt-2 text-sm">
            {courseName}
          </Badge>
        )}
      </div>

      {/* Venue & Date Details */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-amber-900">
            <MapPin className="w-5 h-5" />
            Event Details
          </h3>
          
          {/* Date */}
          {(startDate || endDate) && (
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Date</p>
                <p className="text-amber-800">
                  {startDate}
                  {endDate && endDate !== startDate && ` - ${endDate}`}
                </p>
              </div>
            </div>
          )}

          {/* Venue */}
          {(venueDetails?.venue || venueDetails?.city) && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Venue</p>
                <p className="text-amber-800">
                  {venueDetails.venue}
                  {venueDetails.city && `, ${venueDetails.city}`}
                </p>
                {venueDetails.address && (
                  <p className="text-sm text-amber-700 mt-1">{venueDetails.address}</p>
                )}
              </div>
            </div>
          )}

          {/* Check-in info */}
          <div className="mt-4 pt-4 border-t border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Please arrive 15 minutes early</strong> for registration and check-in.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Download */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => {
          // Generate .ics file for calendar
          const event = {
            title: courseName || "CIMA Course",
            start: venueDetails?.start_date,
            end: venueDetails?.end_date,
            location: [venueDetails?.venue, venueDetails?.city, venueDetails?.address].filter(Boolean).join(", ")
          };
          
          // Create calendar event
          const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${event.start?.replace(/-/g, '')}
DTEND:${event.end?.replace(/-/g, '') || event.start?.replace(/-/g, '')}
SUMMARY:${event.title}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
          
          const blob = new Blob([icsContent], { type: 'text/calendar' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'cima-event.ics';
          a.click();
        }}>
          <Download className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
        
        <Button variant="outline" className="flex-1" onClick={() => {
          // Open Google Maps with venue
          const location = [venueDetails?.venue, venueDetails?.city].filter(Boolean).join(", ");
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
        }}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Get Directions
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard" className="flex-1">
          <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
            <CheckCircle className="w-5 h-5 mr-2" />
            View My Events
          </Button>
        </Link>
        <Link href="/course-catalog" className="flex-1">
          <Button variant="outline" size="lg" className="w-full">
            Browse More Courses
          </Button>
        </Link>
      </div>

      {/* What to Bring */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            What to Bring
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Valid ID for registration
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Laptop or tablet for materials
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Notepad and pen
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Business cards for networking
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      {(transactionRef || amount) && (
        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
          {transactionRef && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction Ref</span>
              <span className="font-mono">{transactionRef}</span>
            </div>
          )}
          {amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">{currency} {amount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
