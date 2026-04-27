'use client';

import { useEffect, useState } from 'react';

interface FactorBarsProps {
  factors: Record<string, any>;
}

export default function FactorBars({ factors }: FactorBarsProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Retraso ligero para trigger de la animación CSS width
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const keys = ['forma', 'h2h', 'local', 'xg', 'motivacion', 'bajas', 'cuotas'];

  const getBarColor = (val: number) => {
    if (val >= 65) return 'bg-green';
    if (val >= 50) return 'bg-yellow';
    return 'bg-red';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {keys.map(k => {
        if (factors[k] === undefined) return null;
        
        const val = Number(factors[k]);
        const noteKey = `${k}_note`;
        const note = factors[noteKey];
        
        return (
          <div key={k} className="flex flex-col space-y-1">
            <div className="flex justify-between text-sm font-mono items-center">
              <span className="text-text capitalize">{k}</span>
              <span className="text-cyan">{val}%</span>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getBarColor(val)} transition-all duration-1000 ease-out`} 
                style={{ width: mounted ? `${val}%` : '0%' }}
              />
            </div>
            {note && <p className="text-xs text-muted mt-1 leading-tight">{note}</p>}
          </div>
        );
      })}
    </div>
  );
}
