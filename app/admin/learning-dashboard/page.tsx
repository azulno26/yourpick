'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

export default function LearningDashboardPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resPatterns = await fetch('/api/admin/learning/patterns'); // I need to create this or use a general endpoint
      const resAdjustments = await fetch('/api/admin/learning/adjustments'); // Same here
      
      // Since I haven't created these yet, I'll use a direct fetch to Supabase or create a route
      // For now, I'll create a dedicated API for the dashboard
      const res = await fetch('/api/admin/learning/data');
      const data = await res.json();
      
      setPatterns(data.patterns || []);
      setAdjustments(data.adjustments || []);
    } catch (err) {
      setError('Error al cargar datos de aprendizaje');
    } finally {
      setLoading(false);
    }
  };

  const runLearning = async () => {
    try {
      setLearning(true);
      const res = await fetch('/api/ai/learn', { method: 'POST' });
      if (!res.ok) throw new Error('Error al ejecutar aprendizaje');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLearning(false);
    }
  };

  const toggleAdjustment = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/admin/learning/adjustments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active })
      });
      await fetchData();
    } catch (err) {
      alert('Error al actualizar regla');
    }
  };

  if (loading) return <div className="py-20 text-center animate-pulse">Cargando motor de aprendizaje...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-4xl tracking-wide text-text mb-1">MOTOR DE APRENDIZAJE</h1>
          <p className="text-sm text-muted">Optimización automática del sistema basada en resultados reales.</p>
        </div>
        <Button onClick={runLearning} disabled={learning}>
          {learning ? 'PROCESANDO...' : 'EJECUTAR APRENDIZAJE AHORA'}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* PATRONES DE ERROR */}
        <section className="space-y-4">
          <h2 className="font-bebas text-2xl tracking-wide text-text flex items-center gap-2">
            <span>🔍</span> Patrones Detectados
          </h2>
          <div className="space-y-3">
            {patterns.length === 0 ? (
              <p className="text-sm text-muted">No se han detectado patrones de error suficientes aún.</p>
            ) : (
              patterns.map((p, i) => (
                <Card key={i} className="p-4 border-border/50">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="red">{p.count} FALLOS</Badge>
                    <span className="text-[10px] font-mono text-muted uppercase">{p.league}</span>
                  </div>
                  <div className="font-bebas text-xl text-text mb-1">{p.pick_type}</div>
                  <p className="text-xs text-muted font-mono">{p.error_pattern}</p>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* REGLAS ACTIVAS */}
        <section className="space-y-4">
          <h2 className="font-bebas text-2xl tracking-wide text-text flex items-center gap-2">
            <span>🧠</span> Reglas de Ajuste (Prompt)
          </h2>
          <div className="space-y-3">
            {adjustments.length === 0 ? (
              <p className="text-sm text-muted">Aún no se han generado reglas automáticas.</p>
            ) : (
              adjustments.map((a) => (
                <Card key={a.id} className={`p-4 transition-opacity ${a.is_active ? 'opacity-100' : 'opacity-50 border-dashed'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={a.is_active ? 'green' : 'gray'}>
                      {a.is_active ? 'ACTIVA' : 'INACTIVA'}
                    </Badge>
                    <button 
                      onClick={() => toggleAdjustment(a.id, !a.is_active)}
                      className="text-xs text-cyan hover:underline"
                    >
                      {a.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                  <p className="text-sm text-text italic leading-relaxed mb-3">
                    "{a.adjustment_rule}"
                  </p>
                  <div className="text-[10px] font-mono text-muted flex justify-between">
                    <span>Impacto: {a.impact_score}%</span>
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
