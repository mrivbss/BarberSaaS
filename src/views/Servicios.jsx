import { Scissors } from 'lucide-react';
import { PlaceholderView } from '../components/layout/PlaceholderView';

export function Servicios() {
  return (
    <PlaceholderView
      title="Servicios"
      subtitle="Configura los servicios y precios de la barbería."
      icon={<Scissors className="h-5 w-5 text-muted" strokeWidth={1.75} />}
      message="Aquí irá el catálogo de servicios..."
    />
  );
}
