import { Wallet } from 'lucide-react';
import { PlaceholderView } from '../components/layout/PlaceholderView';

export function Finanzas() {
  return (
    <PlaceholderView
      title="Finanzas"
      subtitle="Revisa los ingresos y comisiones de la barbería."
      icon={<Wallet className="h-5 w-5 text-muted" strokeWidth={1.75} />}
      message="Aquí irán los reportes financieros..."
    />
  );
}
