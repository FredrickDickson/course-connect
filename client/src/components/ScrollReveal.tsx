import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  threshold = 0.2,
  direction = 'up',
  distance = 30,
  duration = 0.6,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold });

  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0)';
    
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return `translate3d(0, ${distance}px, 0)`;
    }
  };

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${duration}s cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
        transitionDelay: `${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  threshold?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  threshold = 0.2,
  direction = 'up',
  distance = 30,
  duration = 0.6,
}: StaggerContainerProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold });

  // Clone children and add stagger delay to each
  const staggeredChildren = Array.isArray(children) 
    ? children.map((child, index) => {
        if (!child) return child;
        
        const delay = index * staggerDelay;
        
        return (
          <div
            key={index}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible 
                ? 'translate3d(0, 0, 0)' 
                : direction === 'up' 
                  ? `translate3d(0, ${distance}px, 0)`
                  : direction === 'down'
                    ? `translate3d(0, -${distance}px, 0)`
                    : direction === 'left'
                      ? `translate3d(${distance}px, 0, 0)`
                      : `translate3d(-${distance}px, 0, 0)`,
              transition: `opacity ${duration}s cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
              transitionDelay: `${delay}s`,
              willChange: 'opacity, transform',
            }}
          >
            {child}
          </div>
        );
      })
    : children;

  return (
    <div ref={ref} className={cn(className)}>
      {staggeredChildren}
    </div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  index: number;
  isVisible: boolean;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  className?: string;
}

export function StaggerItem({
  children,
  index,
  isVisible,
  staggerDelay = 0.1,
  direction = 'up',
  distance = 30,
  duration = 0.6,
  className,
}: StaggerItemProps) {
  const delay = index * staggerDelay;

  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0)';
    
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return `translate3d(0, ${distance}px, 0)`;
    }
  };

  return (
    <div
      className={cn(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${duration}s cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
        transitionDelay: `${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
