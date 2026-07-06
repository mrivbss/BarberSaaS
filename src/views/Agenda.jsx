import { Calendar } from 'lucide-react';
import { PlaceholderView } from '../components/layout/PlaceholderView';

export function Agenda() {
  return (
    <PlaceholderView
      title="Agenda"
      subtitle="Gestiona las citas de la barbería."
      icon={<Calendar className="h-5 w-5 text-muted" strokeWidth={1.75} />}
      message="Aquí irá el calendario de citas..."
    />
  );
}
