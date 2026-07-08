import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { Loader2 } from 'lucide-react';
import { Button, Input } from '../components/ui';
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
    <PageTransition className="flex min-h-screen w-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-3xl text-foreground tracking-tight">BarberSaaS</h1>
          <p className="text-sm text-muted-foreground">Ingresa tus credenciales para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input 
              type="email" 
              label="CORREO ELECTRÓNICO"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              required
            />
            
            <Input 
              type="password" 
              label="CONTRASEÑA"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            fullWidth
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </PageTransition>
  );
}