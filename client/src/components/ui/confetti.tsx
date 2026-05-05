import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  isActive?: boolean;
  duration?: number;
  zIndex?: number;
}

const Confetti = ({
  isActive = false,
  duration = 3000,
  zIndex = 50,
}: ConfettiProps) => {
  useEffect(() => {
    if (isActive) {
      console.log('Triggering confetti animation');
      
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          zIndex,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          zIndex,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isActive, duration, zIndex]);

  return null; // canvas-confetti creates its own canvas element
};

export default Confetti;
