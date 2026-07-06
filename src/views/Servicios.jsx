import { useState, useEffect } from 'react';
import { Scissors, Plus, Loader2, DollarSign, Clock } from 'lucide-react';
import { barberServices } from '../services/services'; // Importamos el servicio nuevo

export function Servicios() {
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
    try {
      setLoading(true);
      const data = await barberServices.getAll();
      setServicios(data);
    } catch (error) {
      // Dejamos este console.error para que presiones F12 y veas el problema real en el navegador
      console.error('Error real de Supabase:', error);
      alert('No se pudieron cargar los servicios. Revisa la consola (F12).');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    if (!nombre || !precio || !duracion) {
      alert('Completa todos los campos, mi sangre');
      return;
    }

    try {
      setSaving(true);
      const nuevo = await barberServices.create({
        nombre,
        precio: parseFloat(precio),
        duracion: parseInt(duracion, 10)
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-zinc-800 rounded-lg text-amber-500">
          <Scissors className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Servicios</h1>
          <p className="text-sm text-zinc-400">Configura los servicios y precios de la barbería.</p>
        </div>
      </div>

      {/* Contenido en dos columnas: Formulario e Historial/Lista */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Formulario (Columna Izquierda) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl h-fit">
          <h2 className="text-lg font-semibold text-white mb-4">Añadir Servicio</h2>
          <form onSubmit={handleGuardarServicio} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Nombre del Servicio</label>
              <input
                type="text"
                placeholder="Ej. Corte Degradado + Barba"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Precio ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="number"
                    placeholder="10000"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Duración (Min)</label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="number"
                    placeholder="30"
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
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
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Guardar Servicio
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lista de Servicios (Columnas Derecha) */}
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Catálogo Actual</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : servicios.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No hay servicios registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {servicios.map((servicio) => (
                    <tr key={servicio.id} className="hover:bg-zinc-800/50 transition">
                      <td className="px-4 py-3 font-medium text-white">{servicio.nombre}</td>
                      <td className="px-4 py-3 text-amber-400 font-semibold">
                        ${servicio.precio.toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{servicio.duracion} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}