import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

export function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [barberia, setBarberia] = useState<any>(null);
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el formulario de reserva
  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  
  // Estados para los dropdowns personalizados (igual que en la agenda del barbero)
  const [showServices, setShowServices] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showHours, setShowHours] = useState(false);

  // Estado interno del calendario
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS_SEMANA = ['LU','MA','MI','JU','VI','SA','DO'];

  const formatFechaDisplay = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MESES_ES[m - 1]}, ${y}`;
  };

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstWeekday = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
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

  const handleSelectDay = (day: number) => {
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setFecha(`${calendarYear}-${mm}-${dd}`);
    setShowCalendar(false);
  };

  // Slots de hora de 08:00 a 20:00 cada 30 min
  const slotsDeHora = [];
  for (let h = 8; h <= 20; h++) {
    const hh = String(h).padStart(2, '0');
    slotsDeHora.push(`${hh}:00`);
    if (h < 20) {
      slotsDeHora.push(`${hh}:30`);
    }
  }

  const [submitting, setSubmitting] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Reservas | BarberSaaS';
    if (!slug) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data: barberiaData, error: barberiaError } = await supabase
        .from('barberias')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (barberiaError || !barberiaData) {
        setError('No se pudo cargar la información de la barbería.');
        setLoading(false);
        return;
      }

      setBarberia(barberiaData);

      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('*')
        .eq('barberia_id', barberiaData.id);

      setServicios(serviciosData || []);
      setLoading(false);
    }

    fetchData();
  }, [slug]);

  const handleReservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioSeleccionado || !clienteNombre || !fecha || !hora) {
      alert('Por favor completa todos los campos.');
      return;
    }

    setSubmitting(true);
    setMensajeExito(null);

    const { error: insertError } = await supabase.from('citas').insert([
      {
        cliente: clienteNombre,
        servicio_id: servicioSeleccionado.id,
        fecha: fecha,
        hora: hora.includes(':') && hora.split(':').length === 2 ? `${hora}:00` : hora,
        barberia_id: barberia.id,
        estado: 'Pendiente',
      },
    ]);

    setSubmitting(false);

    if (insertError) {
      console.error('Error al crear la cita:', insertError);
      alert('Hubo un error al registrar tu reserva. Inténtalo de nuevo.');
    } else {
      setMensajeExito('¡Cita agendada con éxito! El barbero ya la tiene en su agenda.');
      setClienteNombre('');
      setFecha('');
      setHora('');
      setServicioSeleccionado(null);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold">Cargando...</div>;
  if (error || !barberia) return <div className="p-10 text-center text-red-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        {/* Cabecera */}
        <div className="border-2 border-slate-900 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter">{barberia.nombre}</h1>
          <p className="text-base mt-1 font-medium text-slate-600">📍 {barberia.comuna}</p>
        </div>

        {mensajeExito && (
          <div className="border-2 border-emerald-600 rounded-xl p-4 bg-emerald-50 text-emerald-800 font-bold mb-6 shadow-[4px_4px_0px_0px_rgba(5,150,105,1)]">
            {mensajeExito}
          </div>
        )}

        {/* Tarjeta de Reserva */}
        <div className="border-2 border-slate-900 rounded-xl p-6 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Reserva tu Cita</h2>

          <form onSubmit={handleReservar} className="space-y-4">
            
            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Tu Nombre</label>
              <input
                type="text"
                required
                placeholder="Ej. Martín Rivas"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Servicio (Custom Dropdown) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Servicio</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowServices(!showServices)}
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex justify-between items-center text-left"
                >
                  <span className="truncate">
                    {servicioSeleccionado ? `${servicioSeleccionado.nombre} ($${servicioSeleccionado.precio.toLocaleString('es-CL')})` : 'Selecciona...'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-700 transition-transform duration-200 shrink-0 ${showServices ? 'rotate-180' : ''}`} />
                </button>
                
                {showServices && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowServices(false)} />
                    <div className="absolute left-0 mt-2 w-full bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 overflow-hidden py-1">
                      <div
                        onClick={() => {
                          setServicioSeleccionado(null);
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
                            setServicioSeleccionado(s);
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

            {/* Fecha (Calendario Popover Custom) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Fecha</label>
              <div className="relative">
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

                {showCalendar && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                    <div className="absolute left-0 mt-2 w-[260px] bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 p-4">
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

                      <div className="grid grid-cols-7 mb-1">
                        {DIAS_SEMANA.map(d => (
                          <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-y-1">
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

            {/* Hora (Custom Dropdown) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Hora</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHours(!showHours)}
                  className="w-full border-2 border-slate-900 rounded-lg bg-slate-50 px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex justify-between items-center text-left"
                >
                  <span className={hora ? 'font-bold' : 'text-slate-400 font-medium text-sm'}>{hora || 'Selecciona...'}</span>
                  <Clock className="h-4 w-4 text-slate-700 shrink-0" />
                </button>
                
                {showHours && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowHours(false)} />
                    <div className="absolute left-0 mt-2 w-full max-h-48 overflow-y-auto bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 py-1">
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

            <button
              type="submit"
              disabled={submitting}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-wider border-2 border-slate-900 rounded-lg py-3 w-full shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 transition-all flex justify-center items-center mt-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Reserva'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}