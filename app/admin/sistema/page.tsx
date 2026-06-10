'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import FactorBars from '@/components/FactorBars';
import { useToast } from '@/components/Toast';

export default function AdminSistemaPage() {
  const [weights, setWeights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      const res = await fetch('/api/admin/system/weights');
      const data = await res.json();
      setWeights(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de que deseas resetear los pesos de GPT-4o a sus valores por defecto? Esta acción no se puede deshacer.')) return;

    await fetch('/api/admin/system/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt' })
    });

    showToast('Pesos de GPT-4o reseteados', 'success');
    fetchWeights();
  };

  const handleExport = (type: string) => {
    window.open(`/api/admin/export?type=${type}`, '_blank');
  };

  const normalizeWeights = (w: any) => {
    const normalized: Record<string, number> = {};
    if (!w) return normalized;
    Object.keys(w).forEach(k => {
      normalized[k] = Math.min(100, Math.max(0, w[k] * 50));
    });
    return normalized;
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-cyan font-mono">Cargando sistema...</div>;

  const gptWeights = Array.isArray(weights)
    ? weights.find((row: any) => row.id === 'gpt')
    : weights?.gpt;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
        <div>
          <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">SISTEMA</h1>
          <p className="text-sm text-muted">Configuracion global del motor unico GPT-4o.</p>
        </div>
        <Button variant="danger" onClick={handleReset} className="shadow-lg font-bold">
          RESETEAR PESOS GPT
        </Button>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-mono text-xs text-green uppercase tracking-widest">Pesos GPT-4o</h3>
          <span className="text-xs font-mono text-muted">{gptWeights?.total_iterations || 0} iteraciones</span>
        </div>
        <FactorBars factors={normalizeWeights(gptWeights?.weights)} />
        {gptWeights?.last_learning_note && (
          <p className="text-xs text-muted mt-4 border-t border-border pt-3">{gptWeights.last_learning_note}</p>
        )}
      </Card>

      <Card className="border-border">
        <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">Exportar Datos (CSV)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" onClick={() => handleExport('analyses')}>ANALISIS</Button>
          <Button variant="secondary" onClick={() => handleExport('learning')}>APRENDIZAJE</Button>
          <Button variant="secondary" onClick={() => handleExport('users')}>USUARIOS</Button>
        </div>
      </Card>
    </div>
  );
}
