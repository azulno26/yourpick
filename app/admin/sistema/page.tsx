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
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleReset = async (model: string) => {
    const modelName = model === 'all' ? 'AMBOS MODELOS' : model.toUpperCase();
    if (!confirm(`⚠️ ATENCIÓN ⚠️\n\n¿Estás completamente seguro de que deseas resetear los pesos de ${modelName} a sus valores por defecto (1.0)?\n\nEsta acción borrará todo el aprendizaje acumulado y NO se puede deshacer.`)) return;
    
    await fetch('/api/admin/system/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    
    showToast(`Pesos de ${modelName} reseteados`, 'success');
    fetchWeights();
  };

  const handleExport = (type: string) => {
    window.open(`/api/admin/export?type=${type}`, '_blank');
  };

  const normalizeWeights = (w: any) => {
    // Normalizamos para FactorBars (espera valores entre 0-100)
    // Asumiendo que weight normal es ~1.0, lo mapeamos a 50%.
    const normalized: Record<string, number> = {};
    if (!w) return normalized;
    Object.keys(w).forEach(k => {
      normalized[k] = Math.min(100, Math.max(0, w[k] * 50));
    });
    return normalized;
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-cyan font-mono">Cargando sistema...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
        <div>
          <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">SISTEMA</h1>
          <p className="text-sm text-muted">Configuración global y exportación de datos.</p>
        </div>
        <Button variant="danger" onClick={() => handleReset('all')} className="shadow-lg font-bold">
          ⚠️ RESETEAR AMBOS MODELOS
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono text-xs text-purple uppercase tracking-widest">Pesos Claude</h3>
            <Button variant="secondary" className="px-3 h-8 text-xs" onClick={() => handleReset('claude')}>RESETEAR</Button>
          </div>
          <FactorBars factors={normalizeWeights(weights?.claude?.weights)} />
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono text-xs text-green uppercase tracking-widest">Pesos GPT-4o</h3>
            <Button variant="secondary" className="px-3 h-8 text-xs" onClick={() => handleReset('gpt')}>RESETEAR</Button>
          </div>
          <FactorBars factors={normalizeWeights(weights?.gpt?.weights)} />
        </Card>
      </div>

      <Card className="border-border">
        <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">Exportar Datos (CSV)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" onClick={() => handleExport('analyses')}>📥 ANÁLISIS</Button>
          <Button variant="secondary" onClick={() => handleExport('learning')}>📥 APRENDIZAJE</Button>
          <Button variant="secondary" onClick={() => handleExport('users')}>📥 USUARIOS</Button>
        </div>
      </Card>
    </div>
  );
}
