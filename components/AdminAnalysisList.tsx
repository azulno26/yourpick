'use client';

import { useState } from 'react';
import Card from './Card';
import Badge from './Badge';
import Modal from './Modal';
import AnalysisResult from './AnalysisResult';

interface AdminAnalysisListProps {
  analyses: any[];
}

export default function AdminAnalysisList({ analyses }: AdminAnalysisListProps) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (analysis: any) => {
    setSelectedAnalysis(analysis);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="p-0 overflow-hidden overflow-x-auto border-border bg-surface-1">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border text-[10px] uppercase font-mono text-muted tracking-wider">
              <th className="p-4 md:p-6 font-medium">Usuario</th>
              <th className="p-4 md:p-6 font-medium">Fecha</th>
              <th className="p-4 md:p-6 font-medium">Partido</th>
              <th className="p-4 md:p-6 font-medium">Modelo</th>
              <th className="p-4 md:p-6 font-medium">Predicción</th>
              <th className="p-4 md:p-6 font-medium">Real</th>
              <th className="p-4 md:p-6 font-medium text-center">Aciertos</th>
              <th className="p-4 md:p-6 font-medium text-center">Conf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-sm">
            {analyses.map(a => {
              const hits = a.sections_hit ? Object.values(a.sections_hit).filter(Boolean).length : 0;
              const totalHits = a.sections_hit ? Object.keys(a.sections_hit).length : 0;
              const userObj = Array.isArray(a.users) ? a.users[0] : a.users;
              const userName = userObj?.display_name || userObj?.username || a.user_id.substring(0, 6);
              
              return (
                <tr 
                  key={a.id} 
                  className="hover:bg-surface-2/50 transition-colors group cursor-pointer"
                  onClick={() => handleRowClick(a)}
                >
                  <td className="p-4 md:p-6 whitespace-nowrap">
                    <div className="font-medium text-text">{userName}</div>
                  </td>
                  <td className="p-4 md:p-6 whitespace-nowrap text-muted font-mono text-xs">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 md:p-6">
                    <div className="font-bebas text-lg tracking-wide group-hover:text-cyan transition-colors">
                      {a.match_name}
                    </div>
                    <div className="text-[10px] font-mono text-muted uppercase mt-0.5">{a.league}</div>
                  </td>
                  <td className="p-4 md:p-6">
                    <Badge variant={a.ai_model === 'claude' ? 'purple' : 'green'}>
                      {a.ai_model === 'claude' ? '⚡ CLAUDE' : '🤖 GPT'}
                    </Badge>
                  </td>
                  <td className="p-4 md:p-6 max-w-[150px] truncate" title={a.best_bet}>
                    <span className="font-bold">{a.best_bet}</span>
                  </td>
                  <td className="p-4 md:p-6 font-bebas text-lg">
                    {a.real_score || '-'}
                  </td>
                  <td className="p-4 md:p-6 text-center">
                    {a.status === 'pending' ? (
                      <span className="text-yellow text-xs font-mono">PENDIENTE</span>
                    ) : (
                      <span className={`font-mono font-bold ${a.status === 'win' ? 'text-green' : 'text-red'}`}>
                        {hits}/{totalHits}
                      </span>
                    )}
                  </td>
                  <td className="p-4 md:p-6 text-center">
                    <span className={`font-bebas text-xl ${a.confidence_pct >= 70 ? 'text-green' : a.confidence_pct >= 55 ? 'text-yellow' : 'text-red'}`}>
                      {a.confidence_pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Detail Modal */}
      {selectedAnalysis && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Detalle del Análisis"
          maxWidth="max-w-4xl"
        >
          <div className="max-w-2xl mx-auto">
             <div className="mb-4 flex items-center justify-between bg-surface-2 p-3 rounded-xl border border-border">
                <div className="text-xs font-mono text-muted uppercase">Usuario: <span className="text-text">{selectedAnalysis.users?.display_name || selectedAnalysis.users?.username}</span></div>
                <Badge variant={selectedAnalysis.status === 'win' ? 'green' : selectedAnalysis.status === 'loss' ? 'red' : 'yellow'}>
                    {selectedAnalysis.status.toUpperCase()}
                </Badge>
             </div>
             
             <AnalysisResult analysis={selectedAnalysis} showSaveButton={false} />

             {selectedAnalysis.status !== 'pending' && (
                <Card className="mt-6 border-cyan/30 bg-surface-2">
                    <h4 className="font-mono text-xs text-cyan uppercase mb-3 tracking-widest">Resultado Real</h4>
                    <div className="flex items-center justify-between">
                        <div className="font-bebas text-4xl">{selectedAnalysis.real_score}</div>
                        <div className="flex flex-wrap gap-1 justify-end">
                            {selectedAnalysis.sections_hit && Object.entries(selectedAnalysis.sections_hit).map(([key, hit]) => (
                                <Badge key={key} variant={hit ? 'green' : 'red'} className="text-[9px] px-1.5 py-0.5">
                                    {hit ? '✓' : '✗'} {key}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </Card>
             )}
          </div>
        </Modal>
      )}
    </>
  );
}
