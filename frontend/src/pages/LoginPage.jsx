import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/api';
import toast from 'react-hot-toast';
import { Spinner } from '../components/shared';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      toast.error('Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">LogistiQ</span>
          </div>
          <p className="text-slate-500 text-sm">Система управління ресурсами</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-5">Увійти до системи</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email" className="input" placeholder="admin@logistiq.ua"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Пароль</label>
              <input
                type="password" className="input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 mt-2">
              {loading ? <Spinner /> : null}
              {loading ? 'Входимо...' : 'Увійти'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1 font-medium">Тестові акаунти:</p>
            <p className="text-xs text-slate-400 font-mono">admin@logistiq.ua / admin123</p>
            <p className="text-xs text-slate-400 font-mono">operator@logistiq.ua / operator123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
