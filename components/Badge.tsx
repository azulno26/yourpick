import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'muted';
  className?: string;
}

export default function Badge({ children, variant = 'cyan', className = '' }: BadgeProps) {
  const variants = {
    cyan: 'bg-cyan/10 text-cyan border border-cyan/20',
    green: 'bg-green/10 text-green border border-green/20',
    yellow: 'bg-yellow/10 text-yellow border border-yellow/20',
    red: 'bg-red/10 text-red border border-red/20',
    purple: 'bg-purple/10 text-purple border border-purple/20',
    muted: 'bg-surface-2 text-muted border border-border'
  };

  return (
    <span className={`flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-mono font-medium inline-flex items-center justify-center ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
