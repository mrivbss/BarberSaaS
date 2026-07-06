import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. IMPORTAR ESTO
import { supabase } from '../config/supabaseClient';
import { Lock, Mail, Loader2 } from 'lucide-react';

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
  const navigate = useNavigate(); // 2. INICIALIZAR EL HOOK

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

      // 3. GUARDAR SESIÓN UNIFICADA
      const sesion = {
        id: data.id,
        email: data.email,
        barberia_id: data.barberia_id,
        rol: data.rol
      };

      localStorage.setItem('tenant_session', JSON.stringify(sesion));

      // 4. AVISAR A APP.TSX Y REDIRIGIR
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
    <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* ... El resto de tu JSX se mantiene igual ... */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-md space-y-6 shadow-2xl">
         <div className="text-center space-y-2">
           <h1 className="text-2xl font-bold text-white tracking-tight">BarberSaaS</h1>
           <p className="text-sm text-zinc-400">Ingresa tus credenciales para acceder a la agenda.</p>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
           {/* ... Tus inputs de Correo y Contraseña ... */}
           <div className="space-y-1">
             <label className="text-xs font-medium text-zinc-400">Correo Electrónico</label>
             <div className="relative">
               <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white"
               />
             </div>
           </div>
           
           <div className="space-y-1">
             <label className="text-xs font-medium text-zinc-400">Contraseña</label>
             <div className="relative">
               <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white"
               />
             </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iniciar Sesión'}
           </button>
         </form>
       </div>
    </div>
  );
}