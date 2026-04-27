import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export default function Card({ children, className = '', elevated = false }: CardProps) {
  const bg = elevated ? 'bg-surface-2' : 'bg-surface-1';
  return (
    <div className={`${bg} border border-border rounded-2xl p-4 md:p-5 ${className}`}>
      {children}
    </div>
  );
}
