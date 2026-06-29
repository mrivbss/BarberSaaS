
import { Login } from './views/Login';

import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './views/Dashboard';
import { DashboardHome } from './views/DashboardHome';
import { Agenda } from './views/Agenda';
import { Servicios } from './views/Servicios';
import { Clientes } from './views/Clientes';
import { Finanzas } from './views/Finanzas';

export function App() {
  const session = localStorage.getItem('tenant_session');

  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Dashboard Layout with Nested Routes */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHome />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="servicios" element={<Servicios />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="finanzas" element={<Finanzas />} />
        </Route>
        
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </div>
  );
}