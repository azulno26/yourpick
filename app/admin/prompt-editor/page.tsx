'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

export default function PromptEditorPage() {
  const [prompt, setPrompt] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPrompt();
  }, []);

  const fetchPrompt = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/prompt');
      const data = await res.json();
      
      if (data.prompt) {
        setPrompt(data.prompt.content);
        setInitialPrompt(data.prompt.content);
        setLastUpdate(data.prompt);
      } else {
        // Si no hay prompt en BD, cargar el default del sistema (puedes decidir si mostrar un placeholder)
        setPrompt('');
        setInitialPrompt('');
      }
    } catch (err) {
      setError('Error al cargar el prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch('/api/admin/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prompt })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const data = await res.json();
      setInitialPrompt(prompt);
      setLastUpdate(data.prompt);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = prompt !== initialPrompt;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-bebas text-4xl tracking-wide text-text mb-1">EDITOR DE PROMPT</h1>
          <p className="text-sm text-muted">Configura las instrucciones de SCOUT AI para el análisis.</p>
        </div>
        {lastUpdate && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-muted block">Última actualización</span>
            <span className="text-xs font-mono text-cyan">v{lastUpdate.version} • {new Date(lastUpdate.updated_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {error && (
        <Card className="bg-red/10 border-red/30 py-3 px-4">
          <p className="text-red text-sm">{error}</p>
        </Card>
      )}

      {success && (
        <Card className="bg-green/10 border-green/30 py-3 px-4">
          <p className="text-green text-sm">✓ Cambios guardados correctamente</p>
        </Card>
      )}

      <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-full p-6 bg-surface-2 text-text font-mono text-sm leading-relaxed resize-none focus:outline-none scrollbar-thin scrollbar-thumb-cyan/20"
          placeholder="Escribe el prompt del sistema aquí..."
        />
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex-1"
        >
          {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setPrompt(initialPrompt)}
          disabled={!hasChanges || saving}
          className="px-8"
        >
          DESCARTAR
        </Button>
      </div>

      <div className="bg-surface-1 border border-border p-4 rounded-xl">
        <h3 className="text-xs font-mono text-muted uppercase mb-2">Consejos de SCOUT AI</h3>
        <ul className="text-xs text-muted space-y-1 list-disc pl-4">
          <li>Asegúrate de mantener el formato JSON de salida esperado por el sistema.</li>
          <li>Prueba cambios menores antes de realizar una reestructuración completa.</li>
          <li>Las nuevas versiones se aplican instantáneamente a todos los nuevos análisis.</li>
        </ul>
      </div>
    </div>
  );
}
