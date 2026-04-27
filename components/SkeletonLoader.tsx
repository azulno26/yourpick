import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  type?: 'card' | 'text' | 'title' | 'avatar';
}

export default function SkeletonLoader({ className = '', type = 'card' }: SkeletonProps) {
  if (type === 'text') {
    return <div className={`skeleton h-4 rounded-md w-full ${className}`}></div>;
  }
  
  if (type === 'title') {
    return <div className={`skeleton h-8 rounded-md w-1/2 ${className}`}></div>;
  }

  if (type === 'avatar') {
    return <div className={`skeleton h-12 w-12 rounded-full ${className}`}></div>;
  }

  // Card default
  return (
    <div className={`skeleton rounded-2xl p-4 md:p-5 h-32 w-full ${className}`}></div>
  );
}
