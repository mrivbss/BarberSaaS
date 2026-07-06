import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Receipt, Loader2, ArrowUpRight } from 'lucide-react';
import { financeServices } from '../services/finances';

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

  // Calcular el total acumulado en la caja de la barbería
  const totalIngresos = ganancias.reduce((sum, item) => sum + (item.monto || 0), 0);
  const totalCortes = ganancias.length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-zinc-800 rounded-lg text-emerald-500">
          <DollarSign className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Finanzas</h1>
          <p className="text-sm text-zinc-400">Revisa los ingresos y comisiones reales de la barbería.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen Financiero */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Caja Total */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Ingresos Totales en Caja</p>
                <h2 className="text-3xl font-extrabold text-white">
                  ${totalIngresos.toLocaleString('es-CL')}
                </h2>
              </div>
              <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            {/* Tarjeta Total Servicios */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Servicios Cobrados</p>
                <h2 className="text-3xl font-extrabold text-white">{totalCortes}</h2>
              </div>
              <div className="p-3 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-xl">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Tabla / Lista de Historial de Transacciones */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-white mb-4">Historial de Transacciones</h3>

            {ganancias.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No se registran movimientos de caja todavía.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {ganancias.map((g) => (
                  <div 
                    key={g.id} 
                    className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg flex items-center justify-between hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-zinc-900 text-emerald-500 rounded border border-zinc-800">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{g.concepto || 'Ingreso de barbería'}</p>
                        <p className="text-[10px] text-zinc-500">ID Ref: {g.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        +${g.monto?.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}