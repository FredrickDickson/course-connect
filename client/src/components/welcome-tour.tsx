import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, CheckCircle2 } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to CIMA Community",
    description: "Connect with ADR professionals in 33+ countries. Ask questions, share knowledge, and grow your expertise.",
    icon: "👋",
  },
  {
    title: "Browse Forums",
    description: "Explore various discussion categories including general forums, course-specific boards, and trending topics.",
    icon: "💬",
  },
  {
    title: "Create Posts",
    description: "Share your questions, insights, and experiences with the community. Use rich text formatting and attach files.",
    icon: "✍️",
  },
  {
    title: "Earn Reputation",
    description: "Get recognized for your contributions. Earn badges and reputation points by helping others and participating actively.",
    icon: "🏆",
  },
  {
    title: "Stay Updated",
    description: "Follow interesting discussions, bookmark important posts, and get notified about replies to your content.",
    icon: "🔔",
  },
];

interface WelcomeTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WelcomeTour({ open, onOpenChange }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tour-completed', 'true');
    onOpenChange(false);
  };

  const handleSkip = () => {
    localStorage.setItem('tour-completed', 'true');
    onOpenChange(false);
  };

  // Check if tour was already completed
  useEffect(() => {
    const tourCompleted = localStorage.getItem('tour-completed');
    if (tourCompleted && open) {
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <span className="text-3xl">{tourSteps[currentStep].icon}</span>
            {tourSteps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {tourSteps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 mt-4">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-primary"
                  : index < currentStep
                  ? "w-2 bg-primary"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button variant="ghost" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {currentStep === tourSteps.length - 1 ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
