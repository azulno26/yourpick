'use client';

import { useState, useEffect } from 'react';
import Card from './Card';
import FactorBars from './FactorBars';
import Button from './Button';

function AnimatedNumber({ value, suffix = '', duration = 1000 }: { value: number, suffix?: string, duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(easeProgress * value);
      
      if (progress < 1) window.requestAnimationFrame(step);
      else setDisplayValue(value);
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  const isDecimal = value <= 1 && value > 0;
  const currentVal = isDecimal ? displayValue * 100 : displayValue;
  const formatted = currentVal % 1 !== 0 ? currentVal.toFixed(1) : Math.round(currentVal);
  return <span>{formatted}{suffix}</span>;
}

function Accordion({ title, icon, content }: { title: string, icon: string, content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!content) return null;
  
  return (
    <div className="border border-border rounded-xl bg-surface-1 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 outline-none focus:bg-surface-2 active:bg-surface-2 transition-colors select-none touch-manipulation"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-sans font-medium text-text capitalize">{title}</span>
        </div>
        <span className={`text-cyan transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      <div 
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="p-4 pt-0 text-sm text-muted leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

interface AnalysisResultProps {
  analysis: any;
  showSaveButton?: boolean;
  onSave?: () => void;
}

export default function AnalysisResult({ analysis, showSaveButton = false, onSave }: AnalysisResultProps) {
  const teams = analysis.match_name?.split(/ vs | - | v /i) || [];
  const localTeam = teams[0]?.trim() || 'Local';
  const awayTeam = teams[1]?.trim() || 'Visitante';

  const dateStr = analysis.analysis_date 
    ? new Date(analysis.analysis_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Hoy';

  const staggerDelay = (index: number) => ({ animationDelay: `${index * 100}ms`, animationFillMode: 'both' as const });

  const confPct = analysis.confidence_pct || 0;
  const confColors = {
    high: { text: 'text-green', bg: 'bg-green' },
    mid: { text: 'text-yellow', bg: 'bg-yellow' },
    low: { text: 'text-red', bg: 'bg-red' }
  };
  const conf = confPct >= 70 ? confColors.high : confPct >= 55 ? confColors.mid : confColors.low;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center animate-slide-up" style={staggerDelay(0)}>
        <h1 className="font-bebas text-4xl md:text-5xl uppercase tracking-wide text-text mb-1">
          {analysis.match_name}
        </h1>
        <div className="font-mono text-sm text-muted uppercase">
          {analysis.league} • {dateStr}
        </div>
      </div>

      <Card className="border-green/30 shadow-[0_4px_30px_rgba(34,232,122,0.1)] flex flex-col items-center animate-slide-up" style={staggerDelay(1)}>
        <div className="font-mono text-green text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
          <span>▶</span> Resultado Más Probable
        </div>
        <div className="font-bebas text-5xl md:text-6xl text-text text-center leading-none mb-3">
          {analysis.winner}
        </div>
        {analysis.winner_reason && (
          <p className="text-sm text-muted text-center max-w-[90%]">
            {analysis.winner_reason}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2 md:gap-4 animate-slide-up" style={staggerDelay(2)}>
        {[
          { label: '1', team: localTeam, prob: analysis.prob_local, key: 'local' },
          { label: 'X', team: 'Empate', prob: analysis.prob_empate, key: 'empate' },
          { label: '2', team: awayTeam, prob: analysis.prob_visitante, key: 'visitante' },
        ].map((item, idx) => {
          const maxProb = Math.max(analysis.prob_local || 0, analysis.prob_empate || 0, analysis.prob_visitante || 0);
          const mostLikely = 
            maxProb === analysis.prob_local ? 'local' :
            maxProb === analysis.prob_visitante ? 'visitante' : 'empate';
          
          const isWinner = mostLikely === item.key;
          return (
            <Card key={idx} className={`flex flex-col items-center justify-center p-3 text-center transition-all ${isWinner ? 'border-green/30 bg-surface-2 shadow-lg' : 'border-border/50 opacity-70'}`}>
              <span className={`font-mono text-xs mb-1 ${isWinner ? 'text-green' : 'text-muted'}`}>{item.label}</span>
              <span className={`text-xs font-sans font-medium line-clamp-1 mb-2 ${isWinner ? 'text-text' : 'text-muted'}`} title={item.team}>{item.team}</span>
              <span className={`font-bebas text-2xl ${isWinner ? 'text-green' : 'text-text'}`}>
                <AnimatedNumber value={item.prob || 0} suffix="%" />
              </span>
            </Card>
          );
        })}
      </div>

      <Card className="animate-slide-up" style={staggerDelay(3)}>
        <div className="flex justify-between items-end mb-2">
          <span className="font-mono text-sm text-muted uppercase">Confianza</span>
          <span className={`font-bebas text-4xl leading-none ${conf.text}`}>
            <AnimatedNumber value={confPct} suffix="%" />
          </span>
        </div>
        <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden">
          <div 
            className={`h-full ${conf.bg} transition-all duration-1000 ease-out`} 
            style={{ width: mounted ? `${confPct}%` : '0%' }}
          />
        </div>
      </Card>

      {(analysis.avg_goals_h2h >= 2.5 || analysis.avg_goals_h2h <= 2.0) && (
        <div className={`rounded-xl p-4 border animate-slide-up flex items-center gap-3 ${analysis.avg_goals_h2h >= 2.5 ? 'bg-orange/10 border-orange/30 text-orange' : 'bg-cyan/10 border-cyan/30 text-cyan'}`} style={staggerDelay(4)}>
          <span className="text-2xl">{analysis.avg_goals_h2h >= 2.5 ? '🔥' : '🛡️'}</span>
          <span className="font-medium font-sans">
            {analysis.avg_goals_h2h >= 2.5 ? 'Partido de muchos goles esperado' : 'Partido cerrado esperado'}
          </span>
        </div>
      )}

      <div className="animate-slide-up" style={staggerDelay(5)}>
        <h3 className="font-mono text-xs text-muted uppercase mb-3 px-1">Marcadores Exactos Más Probables</h3>
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-yellow/30 bg-surface-2 flex flex-col items-center p-4 shadow-[0_4px_20px_rgba(255,204,0,0.05)]">
            <span className="text-xs text-yellow font-mono mb-1 uppercase">Top 1</span>
            <span className="font-bebas text-4xl text-text mb-1">{analysis.score_1}</span>
            <span className="text-sm text-muted"><AnimatedNumber value={analysis.prob_1 || 0} suffix="%" /></span>
          </Card>
          <Card className="flex flex-col items-center p-4 opacity-80">
            <span className="text-xs text-muted font-mono mb-1 uppercase">Top 2</span>
            <span className="font-bebas text-4xl text-text mb-1">{analysis.score_2}</span>
            <span className="text-sm text-muted"><AnimatedNumber value={analysis.prob_2 || 0} suffix="%" /></span>
          </Card>
        </div>
      </div>

      <Card className="border-cyan/30 relative overflow-hidden animate-slide-up shadow-[0_4px_30px_rgba(0,212,255,0.05)]" style={staggerDelay(6)}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="font-mono text-cyan text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>💰</span> Apuesta Recomendada
          </div>
          <div className="text-sm text-muted uppercase tracking-wide mb-1 font-medium">
            {analysis.bet_type}
          </div>
          <div className="font-bebas text-4xl md:text-5xl text-text leading-tight mb-3">
            {analysis.best_bet}
          </div>
          {analysis.best_bet_reason && (
            <p className="text-sm text-text/90 bg-surface-2/80 p-3 rounded-xl border border-border">
              {analysis.best_bet_reason}
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={staggerDelay(7)}>
        <Card className="p-3">
          <div className="text-xs text-muted font-mono uppercase mb-1">Goles Esperados</div>
          <div className="font-bebas text-2xl text-cyan">{Number(analysis.goals_expected || 0).toFixed(2)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted font-mono uppercase mb-1">Promedio H2H</div>
          <div className="font-bebas text-2xl text-cyan">{Number(analysis.avg_goals_h2h || 0).toFixed(2)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted font-mono uppercase mb-1">Over/Under</div>
          <div className="font-sans font-bold text-lg text-text">{analysis.over_under}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted font-mono uppercase mb-1">Ambos Anotan</div>
          <div className="font-sans font-bold text-lg text-text">{analysis.both_teams_score}</div>
        </Card>
      </div>

      <div className="animate-slide-up" style={staggerDelay(8)}>
        <h3 className="font-mono text-xs text-muted uppercase mb-4 px-1">Factores Cuantitativos</h3>
        <Card>
          <FactorBars factors={analysis.factors || {}} />
        </Card>
      </div>

      {analysis.recommended_analysis ? (
        <div className="space-y-2 animate-slide-up" style={staggerDelay(9)}>
          <h3 className="font-mono text-xs text-muted uppercase mb-3 px-1 mt-4">Análisis Recomendado</h3>
          <Card className="bg-surface-2 border-border p-5">
            <p className="text-sm md:text-base leading-relaxed text-text">
              {analysis.recommended_analysis}
            </p>
          </Card>
        </div>
      ) : (
        <div className="space-y-2 animate-slide-up" style={staggerDelay(9)}>
          <h3 className="font-mono text-xs text-muted uppercase mb-3 px-1 mt-4">Análisis Detallado</h3>
          <Accordion title="Estado de Forma" icon="📈" content={analysis.analysis?.forma} />
          <Accordion title="Historial (H2H)" icon="⚔️" content={analysis.analysis?.h2h} />
          <Accordion title="Goles" icon="⚽" content={analysis.analysis?.goles} />
          <Accordion title="Estadísticas Clave" icon="📊" content={analysis.analysis?.stats} />
          <Accordion title="Bajas y Sanciones" icon="🏃" content={analysis.analysis?.bajas} />
          <Accordion title="Contexto Cualitativo" icon="🧠" content={analysis.analysis?.cualitativo} />
          <Accordion title="Análisis de Cuotas" icon="💹" content={analysis.analysis?.cuotas} />
        </div>
      )}

      <Card className="border-cyan/30 bg-surface-2 mt-6 animate-slide-up shadow-md" style={staggerDelay(10)}>
        <div className="font-mono text-cyan text-xs uppercase mb-3 tracking-widest font-bold">Veredicto Final</div>
        <p className="text-sm md:text-base leading-relaxed text-text italic border-l-2 border-cyan/50 pl-3">
          "{analysis.final_reasoning}"
        </p>
      </Card>

      {showSaveButton && onSave && (
        <div className="pt-6 pb-2 animate-slide-up" style={staggerDelay(11)}>
          <Button 
            className="w-full bg-green text-black hover:bg-green/90 font-bold border-none" 
            onClick={onSave}
          >
            💾 GUARDAR EN HISTORIAL
          </Button>
        </div>
      )}
    </div>
  );
}
