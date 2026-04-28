'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError('Invalid credentials');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('Error logging in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-slate-800 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-6">YourPick</h1>
        
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 bg-slate-700 text-white rounded"
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-6 bg-slate-700 text-white rounded"
          required
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-cyan-500 text-white rounded font-bold hover:bg-cyan-600 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
