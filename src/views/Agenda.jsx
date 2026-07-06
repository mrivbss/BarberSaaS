import { useState, useEffect } from 'react';
import { Calendar, Plus, Loader2, User, Clock, Tag, DollarSign } from 'lucide-react';
import { appointmentServices } from '../appointments/getAppointments';
import { barberServices } from '../services/services';

export function Agenda() {
  const [citas, setCitas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Para controlar qué botón se está cobrando

  const [cliente, setCliente] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  const [fallbackIds, setFallbackIds] = useState({ barbero_id: '', barberia_id: '' });

  useEffect(() => {
    initAgenda();
  }, []);

  const initAgenda = async () => {
    try {
      setLoading(true);
      const [listaCitas, listaServicios] = await Promise.all([
        appointmentServices.getAll(),
        barberServices.getAll()
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
    e.preventDefault();
    if (!cliente || !servicioId || !fecha || !hora) {
      alert('Completa los campos, mi sangre.');
      return;
    }

    const barberoId = fallbackIds.barbero_id || "5895ab67-bb35-43b3-8809-e936e24f5df2";
    const barberiaId = fallbackIds.barberia_id || "aa318a8d-97af-483b-910c-23d9a1234567";

    try {
      setSaving(true);
      await appointmentServices.create({
        cliente,
        fecha,
        hora: hora.includes(':') && hora.split(':').length === 2 ? `${hora}:00` : hora,
        barbero_id: barberoId,
        barberia_id: barberiaId,
        servicio_id: parseInt(servicioId, 10)
      });

      const actualizada = await appointmentServices.getAll();
      setCitas(actualizada);

      setCliente('');
      setServicioId('');
      setFecha('');
      setHora('');
      alert('¡Cita agendada! Queda en estado pendiente 💈');
    } catch (error) {
      console.error(error);
      alert('Error al agendar.');
    } finally {
      setSaving(false);
    }
  };

  // Funión clave para ejecutar el cobro manual
  // Función clave para ejecutar el cobro manual
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
      
      // Enviamos el cobro directo a la BD inyectando el concepto para cumplir el NOT NULL
      await appointmentServices.cobrarCita(cita.id, {
        monto: precioServicio,
        barbero_id: cita.barbero_id,
        barberia_id: cita.barberia_id,
        concepto: `Cita: ${nombreServicio} - ${cita.cliente}` // 👈 Aquí se llena la columna obligatoria
      });

      alert("Cita finalizada y dinero enviado a Finanzas con éxito 💸");
      
      // Refrescar la lista para ver el cambio reflejado de inmediato
      const actualizada = await appointmentServices.getAll();
      setCitas(actualizada);
    } catch (error) {
      console.error("Error en flujo de cobro:", error);
      alert("Falló el registro del cobro.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-zinc-800 rounded-lg text-amber-500">
          <Calendar className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <p className="text-sm text-zinc-400">Controla reservas y realiza los cobros en caja de forma manual.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Formulario (Izquierda) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl h-fit">
          <h2 className="text-lg font-semibold text-white mb-4">Agendar Cliente</h2>
          <form onSubmit={handleAgendar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Nombre del Cliente</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Cortéz"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Servicio solicitado</label>
              <div className="relative">
                <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <select
                  required
                  value={servicioId}
                  onChange={(e) => set試験 = setServicioId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
                >
                  <option value="">Selecciona el servicio...</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} (${s.precio.toLocaleString('es-CL')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Hora</label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="time"
                    required
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 text-zinc-950 font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Crear Cita</>}
            </button>
          </form>
        </div>

        {/* Panel de Control de Citas con Botón de Caja (Derecha) */}
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Lista de Control</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : citas.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No quedan citas en la agenda.</p>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {citas.map((c) => (
                <div key={c.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">{c.cliente}</h3>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-amber-400 font-medium border border-zinc-800">
                        💈 {c.servicios?.nombre || 'Sin servicio'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-medium border border-zinc-800">
                        ${c.servicios?.precio ? c.servicios.precio.toLocaleString('es-CL') : 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                    <div className="text-left sm:text-right text-xs">
                      <p className="text-white font-medium">{c.fecha}</p>
                      <p className="text-zinc-500 mt-0.5">{c.hora.slice(0, 5)} hrs</p>
                    </div>

                    {/* Lógica condicional del botón de cobro */}
                    {c.estado === 'completada' ? (
                      <span className="text-xs px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-medium">
                        Completada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCobrar(c)}
                        disabled={actionLoading === c.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-1.5 px-3 rounded flex items-center gap-1.5 transition shadow"
                      >
                        {actionLoading === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <DollarSign className="h-3 w-3" />
                            Cobrar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}