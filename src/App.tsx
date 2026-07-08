import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardHome } from './views/DashboardHome';
import { Login } from './views/Login'; 
import { Agenda } from './views/Agenda';
import { Servicios } from './views/Servicios';
import { Finanzas } from './views/Finanzas';

import { Dashboard } from './views/Dashboard';

const DashboardComponent = Dashboard as any;

interface Usuario {
  id: string;
  email: string;
  barberia_id?: string;
  rol?: string;
}

export function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Intentamos recuperar la sesión
    const sesionGuardada = localStorage.getItem('tenant_session');
    if (sesionGuardada) {
      try {
        setUsuario(JSON.parse(sesionGuardada));
      } catch (e) {
        console.error("Error al leer sesión:", e);
        localStorage.removeItem('tenant_session');
      }
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
      {/* Login: Si ya hay usuario, lo mandamos al dashboard */}
      <Route 
        path="/login" 
        element={!usuario ? <Login onLoginSuccess={setUsuario} /> : <Navigate to="/dashboard" />} 
      />

      {/* Dashboard y sus hijos */}
      <Route 
        path="/dashboard" 
        element={usuario ? <DashboardComponent usuario={usuario} setUsuario={setUsuario} /> : <Navigate to="/login" />}
      >
        <Route index element={<DashboardHome usuario={usuario} />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="finanzas" element={<Finanzas />} />

      </Route>

      {/* Ruta por defecto: Redirige según si hay sesión o no */}
      <Route path="*" element={<Navigate to={usuario ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}