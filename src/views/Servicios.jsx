import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { barberServices } from '../services/services';
import { PageTransition } from '../components/layout/PageTransition';
import {
  PageHeader,
  Card,
  Input,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SectionTitle,
  EmptyState
} from '../components/ui';

export function Servicios() {
  const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');
  const barberiaId = sesion?.barberia_id;
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('30');

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
  if (!barberiaId) return; // Asegura que exista el ID
  try {
    setLoading(true);
    const data = await barberServices.getAll(barberiaId); // PASA EL ID AQUÍ
    setServicios(data);
  } catch (error) {
    console.error('Error al cargar:', error);
  } finally {
    setLoading(false);
  }
};

  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    if (!nombre || !precio || !duracion) {
      alert('Completa todos los campos');
      return;
    }

    try {
    setSaving(true);
    const nuevo = await barberServices.create({
      nombre,
      precio: parseFloat(precio),
      duracion: parseInt(duracion, 10),
      barberia_id: barberiaId
    });

      if (nuevo) {
        setServicios([nuevo, ...servicios]);
      }

      setNombre('');
      setPrecio('');
      setDuracion('30');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el servicio');
      setSaving(false);
      setShowForm(false);
    }
  };

  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Servicios"
          subtitle="Gestiona el catálogo de servicios de la barbería."
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-400 text-slate-950 font-black border-2 border-slate-900 rounded-xl px-5 py-2.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-amber-300 active:translate-y-0.5 transition-all flex items-center gap-2 w-fit"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          NUEVO SERVICIO
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6 mb-8 animate-in slide-in-from-top-4 fade-in duration-200">
          <SectionTitle className="mb-5 text-slate-900">Agregar Nuevo Servicio</SectionTitle>
          <form onSubmit={handleGuardarServicio} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">NOMBRE DEL SERVICIO</label>
              <input
                type="text"
                required
                placeholder="Ej. Corte Degradado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">PRECIO ($)</label>
                <input
                  type="number"
                  required
                  placeholder="10000"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">DURACIÓN (MIN)</label>
                <input
                  type="number"
                  required
                  placeholder="30"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving} 
              className="bg-emerald-300 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider border-2 border-slate-900 rounded-lg py-3 w-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all flex justify-center items-center mt-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar Servicio'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      ) : servicios.length === 0 ? (
        <EmptyState title="Sin servicios" description="Añade tu primer servicio para comenzar." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((servicio) => (
            <div key={servicio.id} className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all p-6 flex flex-col justify-between min-h-[160px]">
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-black text-xl text-slate-900 leading-tight">{servicio.nombre}</h3>
                  <span className="shrink-0 font-mono text-xs bg-slate-100 border border-slate-900 px-2 py-1 rounded-md text-slate-700 font-bold">
                    {servicio.duracion} min
                  </span>
                </div>
                <p className="text-sm text-slate-600 font-medium my-3">
                  Servicio profesional de barbería.
                </p>
              </div>
              <div className="flex justify-between items-end mt-4">
                <span className="font-mono font-black text-2xl text-slate-900 tracking-tight">
                  ${servicio.precio.toLocaleString('es-CL')}
                </span>
                <div className="flex gap-2">
                  <button className="border-2 border-slate-900 rounded-lg p-2 hover:bg-amber-300 transition-colors bg-white">
                    <Edit className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
                  </button>
                  <button className="border-2 border-slate-900 rounded-lg p-2 hover:bg-red-400 transition-colors bg-white">
                    <Trash2 className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}