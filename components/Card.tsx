import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  style?: React.CSSProperties;
}

export default function Card({ children, className = '', elevated = false, style }: CardProps) {
  const bg = elevated ? 'bg-surface-2' : 'bg-surface-1';
  return (
    <div className={`${bg} border border-border rounded-2xl p-4 md:p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}
