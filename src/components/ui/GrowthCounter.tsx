'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface GrowthCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}

export function GrowthCounter({
  value,
  prefix = '$',
  suffix = '',
  decimals = 2,
  className,
  duration = 1000,
}: GrowthCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [value, duration]);

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={cn('animate-count font-mono tabular-nums', className)}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
