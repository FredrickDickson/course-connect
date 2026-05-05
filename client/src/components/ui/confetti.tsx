import { useEffect, useState } from "react";
import Lottie from "react-lottie";
import animationData from "@/components/confetti-animation-data";

interface ConfettiProps {
  isActive?: boolean;
  duration?: number;
  autoPlay?: boolean;
  zIndex?: number;
  loop?: boolean;
}

const Confetti = ({
  isActive: externalIsActive,
  duration = 6000,
  autoPlay = false,
  zIndex = 50,
  loop = false,
}: ConfettiProps) => {
  const [isActive, setIsActive] = useState(autoPlay);

  console.log('Confetti component - externalIsActive:', externalIsActive, 'isActive:', isActive);

  // Sync with external control if provided
  useEffect(() => {
    if (externalIsActive !== undefined) {
      setIsActive(externalIsActive);
    }
  }, [externalIsActive]);

  // Handle auto-stop timer
  useEffect(() => {
    let timeoutId: number;
    
    if (isActive && !loop && duration > 0) {
      timeoutId = window.setTimeout(() => {
        setIsActive(false);
      }, duration);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isActive, duration, loop]);

  // Confetti animation options
  const lottieOptions = {
    loop: loop || true,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
    >
      <Lottie 
        options={lottieOptions} 
        height="100%" 
        width="100%" 
        isStopped={!isActive}
      />
    </div>
  );
};

export default Confetti;
