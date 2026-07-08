import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl">
      <PageHeader
        title="Servicios"
        subtitle="Gestiona el catálogo de servicios de la barbería."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form */}
        <Card padding="md" className="lg:col-span-1 h-fit">
          <SectionTitle className="mb-5">Nuevo Servicio</SectionTitle>
          <form onSubmit={handleGuardarServicio} className="space-y-4">
            <Input
              type="text"
              label="NOMBRE"
              placeholder="Ej. Corte Degradado"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="PRECIO ($)"
                placeholder="10000"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
              />
              <Input
                type="number"
                label="DURACIÓN (MIN)"
                placeholder="30"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={saving} fullWidth>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Añadir servicio'}
            </Button>
          </form>
        </Card>

        {/* Table */}
        <div className="lg:col-span-2">
          <SectionTitle className="mb-4">Servicios Activos</SectionTitle>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground/60" />
            </div>
          ) : servicios.length === 0 ? (
            <EmptyState title="Sin servicios" description="Añade tu primer servicio para comenzar." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Duración</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicios.map((servicio) => (
                  <TableRow key={servicio.id}>
                    <TableCell className="font-medium">{servicio.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">${servicio.precio.toLocaleString('es-CL')}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{servicio.duracion} min</TableCell>
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