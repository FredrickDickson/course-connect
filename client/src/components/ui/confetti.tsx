import { useEffect, useState } from "react";
import { useLottie } from "lottie-react";
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

  const options = {
    animationData,
    loop: loop || true,
    autoplay: isActive,
  };

  const { View } = useLottie(options);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
    >
      {View}
    </div>
  );
};

export default Confetti;
