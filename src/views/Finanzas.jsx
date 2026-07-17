import { useState, useEffect } from 'react';
import { DollarSign, Receipt, ArrowUpRight } from 'lucide-react';
import { financeServices } from '../services/finances';
import { PageTransition } from '../components/layout/PageTransition';
import {
  PageHeader,
  StatCard,
  SectionTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState
} from '../components/ui';

export function Finanzas() {
  const [ganancias, setGanancias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanzas();
  }, []);

  // En Finanzas.jsx
const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');

const fetchFinanzas = async () => {
  try {
    setLoading(true);
    // Pasamos el ID de la sesión
    const data = await financeServices.getAll(sesion.barberia_id); 
    setGanancias(data);
  } catch (error) {
    console.error("Error al cargar finanzas:", error);
  } finally {
    setLoading(false);
  }
};

  const totalIngresos = ganancias.reduce((sum, item) => sum + (item.monto || 0), 0);
  const totalCortes = ganancias.length;

  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Finanzas"
        subtitle="Ingresos y rendimiento del negocio."
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground/60" />
        </div>
      ) : (
        <>
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard 
              className="md:col-span-2"
              icon={DollarSign} 
              value={`$${totalIngresos.toLocaleString('es-CL')}`} 
              label="Ingresos en Caja" 
            />
            <StatCard 
              className="md:col-span-1"
              icon={Receipt} 
              value={totalCortes} 
              label="Servicios Cobrados" 
            />
          </div>

          <div>
            <SectionTitle className="mb-4">Historial de Transacciones</SectionTitle>

            {ganancias.length === 0 ? (
              <EmptyState title="Sin movimientos" description="No se registran cobros todavía." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ganancias.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={3} />
                          </div>
                          <span className="font-bold text-slate-900">{g.concepto || 'Ingreso'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-slate-200 border-2 border-slate-900 px-2 py-1 rounded-md font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                          {g.id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-emerald-500 font-mono font-black tabular-nums text-lg">
                        +${g.monto?.toLocaleString('es-CL')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </PageTransition>
  );
}