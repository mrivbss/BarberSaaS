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

  const fetchFinanzas = async () => {
    try {
      setLoading(true);
      const data = await financeServices.getAll();
      setGanancias(data);
    } catch (error) {
      console.error("Error al cargar finanzas:", error);
      alert("No se pudieron cargar los reportes financieros.");
    } finally {
      setLoading(false);
    }
  };

  const totalIngresos = ganancias.reduce((sum, item) => sum + (item.monto || 0), 0);
  const totalCortes = ganancias.length;

  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl">
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
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard 
              icon={DollarSign} 
              value={`$${totalIngresos.toLocaleString('es-CL')}`} 
              label="Ingresos en Caja" 
            />
            <StatCard 
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
                          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-50">
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <span className="font-medium">{g.concepto || 'Ingreso'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {g.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-emerald-700">
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