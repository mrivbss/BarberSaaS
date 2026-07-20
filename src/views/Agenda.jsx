import { useState, useEffect } from 'react';
import { Loader2, Trash2, ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
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

  const [showServices, setShowServices] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Estado interno del calendario (mes/año que se está mostrando)
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS_SEMANA = ['LU','MA','MI','JU','VI','SA','DO'];

  const formatFechaDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MESES_ES[m - 1]}, ${y}`;
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  // Ajustar: lunes=0 ... domingo=6
  const getFirstWeekday = (month, year) => {
    const day = new Date(year, month, 1).getDay(); // 0=dom
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  const handleSelectDay = (day) => {
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setFecha(`${calendarYear}-${mm}-${dd}`);
    setShowCalendar(false);
  };

  // Generar slots de hora de 08:00 a 20:00 cada 30 min
  const slotsDeHora = [];
  for (let h = 8; h <= 20; h++) {
    const hh = String(h).padStart(2, '0');
    slotsDeHora.push(`${hh}:00`);
    if (h < 20) {
      slotsDeHora.push(`${hh}:30`);
    }
  }

  // Leer sesión desde localStorage para obtener los IDs reales del tenant
  const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');
  const agendaBarberoId = sesion?.rol === 'barbero'
    ? (sesion?.barbero_id || sesion?.id)
    : undefined;
  const [fallbackIds, setFallbackIds] = useState({ barbero_id: '', barberia_id: sesion?.barberia_id || '' });

  useEffect(() => {
    initAgenda();
    document.title = 'Agenda | BarberSaaS';
  }, []);

  const initAgenda = async () => {
    try {
      setLoading(true);
      const [listaCitas, listaServicios] = await Promise.all([
        appointmentServices.getAll(sesion.barberia_id, agendaBarberoId),
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
    e.preventDefault();
    if (!cliente || !servicioId || !fecha || !hora) {
      alert('Completa los campos.');
      return;
    }

    const sesion = JSON.parse(localStorage.getItem('tenant_session') || '{}');
    const barberoId = sesion?.barbero_id || sesion?.id; 
    const barberiaId = sesion?.barberia_id;

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

      const actualizada = await appointmentServices.getAll(sesion.barberia_id, agendaBarberoId);
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
      
      const actualizada = await appointmentServices.getAll(sesion.barberia_id, agendaBarberoId);
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

  const selectedService = servicios.find(s => s.id === servicioId);

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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowServices(!showServices)}
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex justify-between items-center text-left"
                >
                  <span className="truncate">
                    {selectedService ? `${selectedService.nombre} ($${selectedService.precio.toLocaleString('es-CL')})` : 'Selecciona...'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-700 transition-transform duration-200 shrink-0 ${showServices ? 'rotate-180' : ''}`} />
                </button>
                
                {showServices && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowServices(false)} />
                    <div className="absolute left-0 mt-2 w-full bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 overflow-hidden py-1">
                      <div
                        onClick={() => {
                          setServicioId('');
                          setShowServices(false);
                        }}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-amber-400 cursor-pointer transition-colors border-b border-slate-100"
                      >
                        Selecciona...
                      </div>
                      {servicios.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setServicioId(s.id);
                            setShowServices(false);
                          }}
                          className="px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-400 cursor-pointer transition-colors border-b last:border-b-0 border-slate-100"
                        >
                          {s.nombre} (${s.precio.toLocaleString('es-CL')})
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">FECHA</label>
                <div className="relative">
                  {/* Trigger del calendario */}
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex justify-between items-center text-left"
                  >
                    <span className={fecha ? 'font-bold' : 'text-slate-400 font-medium text-sm'}>
                      {fecha ? formatFechaDisplay(fecha) : 'DD / MM / AAAA'}
                    </span>
                    <Calendar className="h-4 w-4 text-slate-700 shrink-0" />
                  </button>

                  {/* Popover del Calendario */}
                  {showCalendar && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                      <div className="absolute left-0 mt-2 w-[260px] bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 p-4">
                        {/* Encabezado de navegación */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 border-2 border-slate-900 rounded-lg hover:bg-amber-400 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                            {MESES_ES[calendarMonth]} {calendarYear}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 border-2 border-slate-900 rounded-lg hover:bg-amber-400 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Días de la semana */}
                        <div className="grid grid-cols-7 mb-1">
                          {DIAS_SEMANA.map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">{d}</div>
                          ))}
                        </div>

                        {/* Celdas del mes */}
                        <div className="grid grid-cols-7 gap-y-1">
                          {/* Celdas vacías para el offset del primer día */}
                          {Array.from({ length: getFirstWeekday(calendarMonth, calendarYear) }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                          {Array.from({ length: getDaysInMonth(calendarMonth, calendarYear) }, (_, i) => i + 1).map(day => {
                            const mm = String(calendarMonth + 1).padStart(2, '0');
                            const dd = String(day).padStart(2, '0');
                            const isoDay = `${calendarYear}-${mm}-${dd}`;
                            const isSelected = fecha === isoDay;
                            const isToday = isoDay === `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleSelectDay(day)}
                                className={[
                                  'w-full aspect-square flex items-center justify-center text-xs font-bold rounded-lg transition-all',
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 font-black border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                                    : isToday
                                      ? 'border-2 border-amber-400 text-slate-900 hover:bg-amber-50'
                                      : 'hover:bg-slate-100 text-slate-700'
                                ].join(' ')}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">HORA</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHours(!showHours)}
                    className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex justify-between items-center text-left"
                  >
                    <span>{hora || 'Selecciona...'}</span>
                    <Clock className="h-4 w-4 text-slate-700 shrink-0" />
                  </button>
                  
                  {showHours && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowHours(false)} />
                      <div className="absolute right-0 mt-2 w-full max-h-48 overflow-y-auto bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 py-1 scrollbar-thin">
                        <div
                          onClick={() => {
                            setHora('');
                            setShowHours(false);
                          }}
                          className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-amber-400 cursor-pointer transition-colors border-b border-slate-100"
                        >
                          Selecciona...
                        </div>
                        {slotsDeHora.map((slot) => (
                          <div
                            key={slot}
                            onClick={() => {
                              setHora(slot);
                              setShowHours(false);
                            }}
                            className={`px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-400 cursor-pointer transition-colors border-b last:border-b-0 border-slate-100 ${hora === slot ? 'bg-amber-100' : ''}`}
                          >
                            {slot}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
