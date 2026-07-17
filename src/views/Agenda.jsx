import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { appointmentServices } from '../appointments/getAppointments';
import { barberServices } from '../services/services';
import { PageTransition } from '../components/layout/PageTransition';
import {
  PageHeader,
  Button,
  Input,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SectionTitle,
  EmptyState,
  Badge
} from '../components/ui';

export function Agenda() {
  const [citas, setCitas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [cliente, setCliente] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  // Leer sesión desde localStorage para obtener los IDs reales del tenant
  const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');
  const [fallbackIds, setFallbackIds] = useState({ barbero_id: '', barberia_id: sesion?.barberia_id || '' });

  useEffect(() => {
    initAgenda();
  }, []);

  const initAgenda = async () => {
    try {
      setLoading(true);
      const [listaCitas, listaServicios] = await Promise.all([
        appointmentServices.getAll(sesion.barberia_id),
        barberServices.getAll(sesion.barberia_id)
      ]);
      
      setCitas(listaCitas);
      setServicios(listaServicios);

      if (listaCitas && listaCitas.length > 0) {
        setFallbackIds({
          barbero_id: listaCitas[0].barbero_id,
          barberia_id: listaCitas[0].barberia_id
        });
      }
    } catch (error) {
      console.error(error);
      alert('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAgendar = async (e) => {
    console.log("¡Click detectado en Agendar!");
    e.preventDefault();
    if (!cliente || !servicioId || !fecha || !hora) {
      alert('Completa los campos.');
      return;
    }

    const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');
    const barberoId = sesion?.barbero_id || sesion?.id; 
    const barberiaId = sesion?.barberia_id;

    console.log("Debug IDs:", { barberoId, barberiaId, sesion });

    if (!barberiaId || !barberoId) {
      alert('No se pudo identificar la barbería. Por favor recarga la página.');
      return;
    }

    try {
      setSaving(true);
      await appointmentServices.create({
        cliente,
        fecha,
        hora: hora.includes(':') && hora.split(':').length === 2 ? `${hora}:00` : hora,
        barbero_id: barberoId,
        barberia_id: barberiaId,
        servicio_id: servicioId
      });

      const actualizada = await appointmentServices.getAll(sesion.barberia_id);
      setCitas(actualizada);

      setCliente('');
      setServicioId('');
      setFecha('');
      setHora('');
    } catch (error) {
      console.error(error);
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.status === 409) {
        alert('Ya existe una cita en ese horario. Por favor elige otra fecha u hora.');
      } else {
        alert('Error al agendar. Revisa los datos e intenta nuevamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCobrar = async (cita) => {
    const precioServicio = cita.servicios?.precio || 0;
    const nombreServicio = cita.servicios?.nombre || 'Servicio';
    
    if (precioServicio === 0) {
      alert("Esta cita no tiene un precio válido asignado en servicios.");
      return;
    }

    const confirmar = window.confirm(`¿Confirmas el cobro de $${precioServicio.toLocaleString('es-CL')} por el servicio de ${cita.cliente}?`);
    if (!confirmar) return;

    try {
      setActionLoading(cita.id);
      
      // ... dentro de handleCobrar, antes del await
      const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');

      await appointmentServices.cobrarCita(cita.id, {
        monto: precioServicio,
        barbero_id: cita.barbero_id || sesion?.id,
        barberia_id: cita.barberia_id || sesion?.barberia_id,
        concepto: `Cita: ${nombreServicio} - ${cita.cliente}`
      });
      
      const actualizada = await appointmentServices.getAll(sesion.barberia_id);
      setCitas(actualizada);
    } catch (error) {
      console.error("Error en flujo de cobro:", error);
      alert("Falló el registro del cobro.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEliminar = async (cita) => {
    const confirmar = window.confirm('¿Estás seguro de eliminar esta cita?');
    if (!confirmar) return;

    try {
      setActionLoading(`delete-${cita.id}`);
      const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');
      
      await appointmentServices.deleteCita(cita.id, sesion.barberia_id);
      
      setCitas(prev => prev.filter(c => c.id !== cita.id));
    } catch (error) {
      console.error("Error al eliminar la cita:", error);
      alert("Falló la eliminación de la cita.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl">
      <PageHeader
        title="Agenda"
        subtitle="Gestiona reservas y cobros en tiempo real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form */}
        <div className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6 lg:col-span-1 h-fit">
          <SectionTitle className="mb-5 text-slate-900">Nueva Cita</SectionTitle>
          <form onSubmit={handleAgendar} className="space-y-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">CLIENTE</label>
              <input
                type="text"
                required
                placeholder="Nombre del cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">SERVICIO</label>
              <select
                required
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer appearance-none"
              >
                <option value="">Selecciona...</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} (${s.precio.toLocaleString('es-CL')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">FECHA</label>
                <input 
                  type="date" 
                  required 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)} 
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">HORA</label>
                <input 
                  type="time" 
                  required 
                  value={hora} 
                  onChange={(e) => setHora(e.target.value)} 
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving} 
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-wider border-2 border-slate-900 rounded-lg py-3 w-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all flex justify-center items-center mt-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Agendar cita'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <SectionTitle className="mb-4">Control del Día</SectionTitle>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground/60" />
            </div>
          ) : citas.length === 0 ? (
            <EmptyState title="Sin citas" description="No hay citas agendadas." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {citas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-bold text-slate-900">{c.cliente}</p>
                      <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                        {c.servicios?.nombre || 'Sin servicio'} · ${c.servicios?.precio ? c.servicios.precio.toLocaleString('es-CL') : 0}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-slate-600 font-medium">{c.fecha}</p>
                      <p className="text-[13px] font-mono font-bold text-slate-900 mt-0.5">{c.hora.slice(0, 5)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.estado === 'completada' ? (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-emerald-300 text-slate-950 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            Cobrada
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCobrar(c)}
                            disabled={actionLoading === c.id || actionLoading === `delete-${c.id}`}
                            className="inline-flex items-center px-3 py-1 rounded-md font-mono text-xs font-bold bg-amber-300 hover:bg-amber-400 text-slate-950 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all disabled:opacity-50"
                          >
                            {actionLoading === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cobrar'}
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminar(c)}
                          disabled={actionLoading === c.id || actionLoading === `delete-${c.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-md text-red-600 hover:bg-red-100 border border-transparent hover:border-red-900 active:translate-y-0.5 transition-all disabled:opacity-50"
                        >
                          {actionLoading === `delete-${c.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </PageTransition>
  );
}