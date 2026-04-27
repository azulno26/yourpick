'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import StatsCard from '@/components/StatsCard';
import Button from '@/components/Button';

export default function PerfilPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { winRate, totalAnalyses, sectionHits } = stats || { winRate: 0, totalAnalyses: 0, sectionHits: {} };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-4">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">PERFIL Y ESTADÍSTICAS</h1>
        <p className="text-sm text-muted">Tu desempeño global utilizando la IA de YourPick.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatsCard title="ACIERTOS GLOBALES" value={winRate} suffix="%" />
        <StatsCard title="TOTAL ANÁLISIS" value={totalAnalyses} />
      </div>

      <h3 className="font-mono text-xs text-muted uppercase mt-8 mb-2 px-1 tracking-widest">Tasa de Acierto por Sección</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center justify-center py-5 border-border shadow-sm">
          <span className="font-mono text-[10px] text-muted uppercase mb-1">Ganador 1X2</span>
          <span className="font-bebas text-3xl text-text">
            {sectionHits?.winner !== undefined ? Math.round(sectionHits.winner) : 0}%
          </span>
        </Card>
        
        <Card className="flex flex-col items-center justify-center py-5 border-border shadow-sm">
          <span className="font-mono text-[10px] text-muted uppercase mb-1">Apuesta Recomendada</span>
          <span className="font-bebas text-3xl text-cyan">
            {sectionHits?.best_bet !== undefined ? Math.round(sectionHits.best_bet) : 0}%
          </span>
        </Card>
        
        <Card className="flex flex-col items-center justify-center py-5 border-border shadow-sm">
          <span className="font-mono text-[10px] text-muted uppercase mb-1">Marcador 1</span>
          <span className="font-bebas text-3xl text-text">
            {sectionHits?.score_1 !== undefined ? Math.round(sectionHits.score_1) : 0}%
          </span>
        </Card>
        
        <Card className="flex flex-col items-center justify-center py-5 border-border shadow-sm">
          <span className="font-mono text-[10px] text-muted uppercase mb-1">Marcador 2</span>
          <span className="font-bebas text-3xl text-text">
            {sectionHits?.score_2 !== undefined ? Math.round(sectionHits.score_2) : 0}%
          </span>
        </Card>
      </div>

      <div className="pt-12">
        <Button 
          variant="danger" 
          className="w-full text-sm font-bold tracking-wider" 
          onClick={handleLogout}
        >
          CERRAR SESIÓN
        </Button>
      </div>
    </div>
  );
}
