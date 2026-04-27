import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  className?: string;
}

export default function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyles = "min-h-[44px] flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-cyan/50 select-none";
  
  let variantStyles = "";
  if (variant === 'primary') {
    variantStyles = "bg-cyan text-black font-bebas tracking-wider rounded-xl text-lg px-6 md:hover:bg-cyan/90";
  } else if (variant === 'secondary') {
    variantStyles = "border border-cyan/20 text-cyan bg-transparent rounded-xl px-6 md:hover:bg-cyan/10";
  } else if (variant === 'danger') {
    variantStyles = "bg-red/10 border border-red/30 text-red rounded-xl px-6 md:hover:bg-red/20";
  }

  return (
    <button 
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
