'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from './Card';
import Button from './Button';

interface EvaluateFormProps {
  analysisId: string;
}

export default function EvaluateForm({ analysisId }: EvaluateFormProps) {
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formato "X-X"
    if (!/^\d+-\d+$/.test(score)) {
      setError('El formato debe ser exacto, ej: 2-1');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/analyses/${analysisId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ real_score: score })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Error al evaluar');
        setLoading(false);
        return;
      }

      // Éxito: forzar refresco de la ruta para mostrar los nuevos datos de DB server-side
      router.refresh();
    } catch (err) {
      setError('Error de red');
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple/30 bg-surface-2 mt-8 animate-fade-in shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚖️</span>
        <h3 className="font-bebas text-2xl text-purple tracking-wide">EVALUAR RESULTADO</h3>
      </div>
      <p className="text-sm text-muted mb-4">
        Ingresa el marcador final real del partido para que la IA aprenda y ajuste sus pesos automáticamente.
      </p>

      <form onSubmit={handleEvaluate} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase text-muted mb-1 ml-1">Marcador Real (Local - Visitante)</label>
          <input 
            type="text" 
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple text-text font-mono text-center text-lg tracking-widest"
            placeholder="Ej: 2-1"
            value={score}
            onChange={e => setScore(e.target.value)}
            disabled={loading}
            maxLength={5}
            required
          />
        </div>

        {error && (
          <div className="text-red text-xs text-center">{error}</div>
        )}

        <Button 
          type="submit" 
          className="w-full bg-purple text-white hover:bg-purple/90" 
          disabled={loading || score.length < 3}
        >
          {loading ? 'EVALUANDO...' : 'CONFIRMAR RESULTADO'}
        </Button>
      </form>
    </Card>
  );
}
