import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './views/Login'; 
import { Agenda } from './views/Agenda';
import { Servicios } from './views/Servicios';
import { Finanzas } from './views/Finanzas';
import { Clientes } from './views/Clientes';
import { Dashboard } from './views/Dashboard';
// ... los demás imports ...

// 💡 Agrega esta línea mágica aquí abajo para desactivar el rastreo de TS en este componente:
const DashboardComponent = Dashboard as any;

// 💡 Definimos la estructura que tiene tu usuario en Supabase
interface Usuario {
  id: string;
  email: string;
  barberia_id?: string;
}

export function App() {
  // 🔒 Indicamos que el estado puede ser de tipo Usuario o null
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('barber_user');
    if (usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-white">
        Cargando sistema...
      </div>
    );
  }

  return (
    <Routes>
      {/* Ruta Pública: Login */}
      <Route 
        path="/login" 
        element={!usuario ? <Login onLoginSuccess={(user: Usuario) => setUsuario(user)} /> : <Navigate to="/dashboard/agenda" />} 
      />

      {/* Rutas Privadas */}
      <Route 
        path="/dashboard" 
        element={usuario ? <DashboardComponent usuario={usuario} setUsuario={setUsuario} /> : <Navigate to="/login" />}
      >
        <Route path="agenda" element={<Agenda />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="clientes" element={<Clientes />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to={usuario ? "/dashboard/agenda" : "/login"} />} />
    </Routes>
  );
}