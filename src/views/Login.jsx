import { useState } from 'react';
import { Scissors } from 'lucide-react';
import { loginUser } from '../services/login';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const session = await loginUser(email, password);
    setLoading(false);

    if (session) {
      navigate('/dashboard');
    } else {
      alert('Error al iniciar sesión. Revisa tus credenciales.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card padding="lg" className="w-full max-w-[400px] animate-slide-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06] border border-border-subtle">
            <Scissors className="h-5 w-5 text-foreground" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            BarberSaaS
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Gestión Multi-tenant de Barberías
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="nombre@barberia.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" disabled={loading} fullWidth size="lg" className="mt-1">
            {loading ? 'Cargando...' : 'Entrar a la Barbería'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
