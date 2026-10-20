/**
 * Profile Completion Banner
 * Prompts users to complete their profile (optional but encouraged)
 */

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompletionBannerProps {
  /**
   * Where to show banner
   * - 'top' = fixed at top of page
   * - 'inline' = within page content
   */
  position?: 'top' | 'inline';
  
  /**
   * Can user dismiss this banner?
   */
  dismissible?: boolean;
}

export default function ProfileCompletionBanner({ 
  position = 'top',
  dismissible = true 
}: ProfileCompletionBannerProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user has completed their profile
  // Only check basic required fields - firstName and lastName are set during registration
  // Country, phone, etc. are considered "profile completion" items
  const isProfileComplete = user && user.phone; // Phone is the key field tracked in onboarding

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem('profileBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('profileBannerDismissed', 'true');
  };

  // Don't show if:
  // 1. Profile is already complete
  // 2. User dismissed it
  // 3. Not logged in
  if (!user || isProfileComplete || isDismissed) {
    return null;
  }

  const bannerContent = (
    <Alert 
      className={`
        bg-gradient-to-r from-[#FFF4E6] to-[#FFE8CC] 
        border-[#B49A67] 
        ${position === 'top' ? 'rounded-none border-x-0 border-t-0' : ''}
      `}
    >
      <User className="h-4 w-4 text-[#5A2633]" />
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[#5A2633] font-medium">
            Complete your profile to unlock all features and get personalized course recommendations.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/onboarding">
            <Button 
              size="sm" 
              className="bg-[#5A2633] hover:bg-[#3D1A22] text-white h-8"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Complete Profile
            </Button>
          </Link>
          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#5A2633] hover:bg-[#5A2633]/10"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );

  if (position === 'top') {
    return (
      <div className="sticky top-16 z-30">
        {bannerContent}
      </div>
    );
  }

  return bannerContent;
}
