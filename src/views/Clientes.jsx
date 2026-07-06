import { Users } from 'lucide-react';
import { PlaceholderView } from '../components/layout/PlaceholderView';

export function Clientes() {
  return (
    <PlaceholderView
      title="Clientes"
      subtitle="Administra la base de datos de clientes de la barbería."
      icon={<Users className="h-5 w-5 text-muted" strokeWidth={1.75} />}
      message="Aquí irá el listado de clientes..."
    />
  );
}
