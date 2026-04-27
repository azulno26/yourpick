'use client';

import { useEffect, useState } from 'react';
import Card from './Card';

interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

export default function StatsCard({ title, value, suffix = '', className = '', animate = true }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) return;
    
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    const duration = 1000; // 1 segundo
    let startTimestamp: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(start + easeProgress * (end - start));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, animate]);

  const isDecimal = value % 1 !== 0;
  const formattedValue = isDecimal ? displayValue.toFixed(1) : Math.round(displayValue);

  return (
    <Card className={`flex flex-col justify-center items-center text-center animate-slide-up ${className}`}>
      <span className="text-muted text-sm uppercase tracking-wider mb-2 font-medium">{title}</span>
      <div className="flex items-baseline">
        <span className="font-bebas text-4xl text-cyan">{formattedValue}</span>
        {suffix && <span className="font-bebas text-xl text-cyan ml-1">{suffix}</span>}
      </div>
    </Card>
  );
}
