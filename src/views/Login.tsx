import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { Loader2, Scissors } from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';

interface Usuario {
  id: string;
  email: string;
  barberia_id?: string;
  rol?: string;
}

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) return alert('Completa todos los campos');

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email.trim())
        .eq('password', password.trim())
        .single();

      if (error || !data) {
        alert('Credenciales incorrectas.');
        return;
      }

      const sesion = {
        id: data.id,
        email: data.email,
        barberia_id: data.barberia_id,
        rol: data.rol
      };

      localStorage.setItem('tenant_session', JSON.stringify(sesion));

      onLoginSuccess(sesion);
      navigate('/dashboard');

    } catch (err) {
      console.error(err);
      alert('Error al intentar conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-screen flex items-center justify-center bg-[#f4f4f6] p-4">
      <div className="max-w-md w-full bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] space-y-6">
        
        <div className="flex flex-col items-center text-center">
          <div className="bg-amber-400 border-2 border-slate-900 rounded-xl p-3 w-12 h-12 flex items-center justify-center text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mb-4">
            <Scissors className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <h1 className="font-black text-2xl text-slate-900 tracking-tight">Iniciar Sesión</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Ingresa a tu panel de BarberSaaS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1 block">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              required
              className="w-full border-2 border-slate-900 rounded-xl bg-slate-50 px-4 py-3 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-slate-400"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border-2 border-slate-900 rounded-xl bg-slate-50 px-4 py-3 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-slate-400"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-wider border-2 border-slate-900 rounded-xl py-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>

      </div>
    </PageTransition>
  );
}