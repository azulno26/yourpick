'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import AnalysisResult from '@/components/AnalysisResult';

const CHIPS = ['Real Madrid vs Barcelona', 'Manchester City vs Arsenal', 'Bayern Munich vs BVB', 'Tigres vs Monterrey', 'Boca Juniors vs River Plate'];

const LOADING_STEPS = [
  { pct: 12, text: 'Buscando datos en tiempo real...' },
  { pct: 28, text: 'Analizando forma reciente...' },
  { pct: 45, text: 'Calculando métricas H2H...' },
  { pct: 62, text: 'Evaluando bajas y cuotas...' },
  { pct: 78, text: 'Aplicando algoritmo Poisson...' },
  { pct: 92, text: 'Construyendo pronóstico final...' },
];

export default function AnalizarPage() {
  const [match, setMatch] = useState('');
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, text: '' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        // user stats return totalAnalyses, etc.
        // But we actually need daily usage... Wait, our stats API doesn't return today's usage for standard users.
        // But the POST /api/analyze handles the 429 logic.
        // We can just try and let it fail, or we can fetch a specific endpoint. 
        // For simplicity, we just assume allowed until POST says 429.
        setIsAllowed(true); 
      })
      .catch(() => setIsAllowed(true)); // Assume true, fallback to 429 on submit
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);

    // Iniciar loader simulado (avanza independientemente de la red)
    let step = 0;
    setProgress(LOADING_STEPS[0]);
    
    const interval = setInterval(() => {
      step++;
      if (step < LOADING_STEPS.length) {
        setProgress(LOADING_STEPS[step]);
      } else {
        clearInterval(interval);
      }
    }, 3500); // Avanza cada 3.5s

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match })
      });
      
      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) {
        if (res.status === 429) setIsAllowed(false);
        else setError(data.error || 'Hubo un error al generar el análisis.');
        setLoading(false);
        return;
      }

      setProgress({ pct: 100, text: '¡Análisis Completado!' });
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 500);

    } catch (err) {
      clearInterval(interval);
      setError('Error de red. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  if (isAllowed === false) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in px-4">
        <Card className="text-center p-8 max-w-sm border-red/30">
          <div className="text-6xl mb-4">🛑</div>
          <h2 className="font-bebas text-3xl text-red tracking-wider mb-2">LÍMITE ALCANZADO</h2>
          <p className="text-muted text-sm">Has consumido tus 3 análisis de hoy. Vuelve mañana para seguir pronosticando con IA.</p>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <Button variant="secondary" onClick={() => setResult(null)} className="text-sm px-4">
            ← NUEVO ANÁLISIS
          </Button>
        </div>
        <AnalysisResult 
          analysis={result} 
          showSaveButton={true} 
          onSave={() => setSaved(true)} 
        />
        {/* El botón guardar de AnalysisResult disparará esto */}
        {saved && (
          <div className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <span className="bg-green text-black font-bold px-6 py-3 rounded-full shadow-lg border border-green/50">
              ✅ GUARDADO EN HISTORIAL
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">NUEVO ANÁLISIS</h1>
        <p className="text-sm text-muted">Ingresa los equipos para obtener un pronóstico predictivo.</p>
      </div>

      <Card elevated className="border-cyan/20">
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div>
            <label className="block text-xs font-mono uppercase text-cyan mb-2 ml-1">Partido a analizar</label>
            <input 
              type="text" 
              className="w-full bg-bg border border-border rounded-xl px-5 py-4 focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan text-text text-lg transition-all"
              placeholder="Ej: Real Madrid vs Barcelona"
              value={match}
              onChange={e => setMatch(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {!loading && (
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-2 ml-1">Sugerencias rápidas</label>
              <div className="flex flex-wrap gap-2">
                {CHIPS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    className="bg-surface-2 border border-border text-muted hover:text-cyan hover:border-cyan/30 text-xs py-2 px-3 rounded-lg transition-colors active:scale-95"
                    onClick={() => setMatch(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red/10 border border-red/30 text-red text-sm p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          {!loading ? (
            <Button type="submit" className="w-full shadow-lg" disabled={!match.trim()}>
              ⚡ GENERAR ANÁLISIS
            </Button>
          ) : (
            <div className="pt-4 pb-2">
              <div className="flex justify-between font-mono text-xs mb-2">
                <span className="text-cyan animate-pulse">{progress.text}</span>
                <span className="text-muted">{progress.pct}%</span>
              </div>
              <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan transition-all duration-[3000ms] ease-out relative overflow-hidden"
                  style={{ width: `${progress.pct}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
