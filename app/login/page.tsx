'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      if (data.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError('Error de conexión al servidor');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 animate-fade-in">
      <Card className="w-full max-w-sm border-cyan/20" elevated>
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">⚡</div>
          <h1 className="font-bebas text-5xl text-cyan tracking-wider leading-none">YOURPICK</h1>
          <p className="text-muted text-sm mt-1 font-mono uppercase tracking-widest">Predicciones IA</p>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 text-red text-sm p-3 rounded-xl mb-5 text-center animate-slide-up">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1 ml-1">Usuario</label>
            <input 
              type="text" 
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/50 text-text transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1 ml-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/50 text-text transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full mt-2 font-bold" disabled={loading}>
            {loading ? 'ACCEDIENDO...' : 'INICIAR SESIÓN'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
