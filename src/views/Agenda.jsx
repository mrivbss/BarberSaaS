import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
        servicio_id: parseInt(servicioId, 10)
      });

      const actualizada = await appointmentServices.getAll();
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
      
      await appointmentServices.cobrarCita(cita.id, {
        monto: precioServicio,
        barbero_id: cita.barbero_id,
        barberia_id: cita.barberia_id,
        concepto: `Cita: ${nombreServicio} - ${cita.cliente}`
      });
      
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
    <PageTransition className="p-8 lg:p-10 max-w-6xl">
      <PageHeader
        title="Agenda"
        subtitle="Gestiona reservas y cobros en tiempo real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form */}
        <Card padding="md" className="lg:col-span-1 h-fit">
          <SectionTitle className="mb-5">Nueva Cita</SectionTitle>
          <form onSubmit={handleAgendar} className="space-y-4">
            
            <Input
              type="text"
              required
              label="CLIENTE"
              placeholder="Nombre del cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SERVICIO</label>
              <select
                required
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-input outline-none transition-all duration-200 hover:border-foreground/20 focus:shadow-input-focus focus:border-foreground cursor-pointer appearance-none"
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
              <Input type="date" required label="FECHA" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <Input type="time" required label="HORA" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>

            <Button type="submit" disabled={saving} fullWidth>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agendar cita'}
            </Button>
          </form>
        </Card>

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
                      <p className="font-medium text-foreground">{c.cliente}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {c.servicios?.nombre || 'Sin servicio'} · ${c.servicios?.precio ? c.servicios.precio.toLocaleString('es-CL') : 0}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{c.fecha}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{c.hora.slice(0, 5)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.estado === 'completada' ? (
                        <Badge variant="success">Cobrada</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCobrar(c)}
                          disabled={actionLoading === c.id}
                        >
                          {actionLoading === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cobrar'}
                        </Button>
                      )}
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